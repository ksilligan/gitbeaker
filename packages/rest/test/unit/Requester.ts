import type { RequestOptions } from '@gitbeaker/requester-utils';
import { defaultOptionsHandler, defaultRequestHandler, processBody } from '../../src/Requester';

global.fetch = jest.fn();

const MockFetch = global.fetch as jest.Mock;

describe('processBody', () => {
  it('should return a json object if type is application/json', async () => {
    const output = await processBody({
      json() {
        return Promise.resolve({ test: 5 });
      },
      headers: {
        entries() {
          return [['content-type', 'application/json']];
        },
        get() {
          return 'application/json';
        },
      },
    } as unknown as Response);

    expect(output).toMatchObject({ test: 5 });
  });

  it('should return a blob if type is octet-stream, binary, or gzip', async () => {
    const blobData = new Blob(['test'], {
      type: 'plain/text',
    });

    const output = [
      processBody({
        blob() {
          return Promise.resolve(blobData);
        },
        headers: {
          entries() {
            return [['content-type', 'application/octet-stream']];
          },
          get() {
            return 'application/octet-stream';
          },
        },
      } as unknown as Response),
      processBody({
        blob() {
          return Promise.resolve(blobData);
        },
        headers: {
          entries() {
            return [['content-type', 'binary/octet-stream']];
          },
          get() {
            return 'binary/octet-stream';
          },
        },
      } as unknown as Response),
      processBody({
        blob() {
          return Promise.resolve(blobData);
        },
        headers: {
          entries() {
            return [['content-type', 'image/png']];
          },
          get() {
            return 'image/png';
          },
        },
      } as unknown as Response),
      processBody({
        blob() {
          return Promise.resolve(blobData);
        },
        headers: {
          entries() {
            return [['content-type', 'application/gzip']];
          },
          get() {
            return 'application/gzip';
          },
        },
      } as unknown as Response),
    ];

    const fulfilled = await Promise.all(output);

    fulfilled.forEach((o) => expect(o).toBeInstanceOf(Blob));
  });

  it('should return a string if type is text/<subtype>', async () => {
    const output = await processBody({
      text() {
        return Promise.resolve('test');
      },
      headers: {
        entries() {
          return [['content-type', 'text/plain']];
        },
        get() {
          return 'text/plain';
        },
      },
    } as unknown as Response);

    expect(typeof output).toBe('string');
    expect(output).toEqual('test');
  });

  it('should return a empty string when presented with an unknown content-type and empty body', async () => {
    const blobData = new Blob(['test'], {
      type: 'plain/text',
    });

    const output = await processBody({
      blob() {
        return Promise.resolve(blobData);
      },
      headers: {
        entries() {
          return [['content-type', 'application/fake']];
        },
        get() {
          return 'fake';
        },
      },
    } as unknown as Response);

    expect(output).toBeInstanceOf(Blob);
    expect(output.size).toBe(4);
  });
});

describe('defaultRequestHandler', () => {
  it('should return an error with the statusText as the primary message and a description derived from a error property when response has an error property', async () => {
    const stringBody = { error: 'msg' };

    MockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: false,
        status: 501,
        statusText: 'Really Bad Error',
        headers: {
          entries() {
            return [['content-type', 'application/json']];
          },
          get() {
            return 'application/json';
          },
        },
        json: () => Promise.resolve(stringBody),
        text: () => Promise.resolve(JSON.stringify(stringBody)),
      }),
    );

    await expect(defaultRequestHandler('http://test.com', {} as RequestOptions)).rejects.toThrow({
      message: 'Really Bad Error',
      name: 'Error',
      cause: {
        description: 'msg',
      },
    });
  });

  it('should return correct properties if request is valid', async () => {
    MockFetch.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(JSON.stringify({})),
        ok: true,
        status: 200,
        headers: {
          entries() {
            return [['content-type', 'application/json']];
          },
          get() {
            return 'application/json';
          },
        },
      }),
    );

    const output = await defaultRequestHandler('http://test.com', {} as RequestOptions);

    expect(output).toMatchObject({
      body: {},
      headers: {},
      status: 200,
    });
  });

  it('should handle a prefix url correctly', async () => {
    MockFetch.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(JSON.stringify({})),
        ok: true,
        status: 200,
        headers: {
          entries() {
            return [['content-type', 'application/json']];
          },
          get() {
            return 'application/json';
          },
        },
      }),
    );

    await defaultRequestHandler('testurl', {
      prefixUrl: 'http://test.com',
    } as RequestOptions);

    expect(MockFetch).toHaveBeenCalledWith(new URL('http://test.com/testurl'), { mode: undefined });
  });

  it('should handle a searchParams correctly', async () => {
    MockFetch.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(JSON.stringify({})),
        ok: true,
        status: 200,
        headers: {
          entries() {
            return [['content-type', 'application/json']];
          },
          get() {
            return 'application/json';
          },
        },
      }),
    );

    await defaultRequestHandler('testurl/123', {
      searchParams: 'test=4',
      prefixUrl: 'http://test.com',
    } as RequestOptions);

    expect(MockFetch).toHaveBeenCalledWith(new URL('http://test.com/testurl/123?test=4'), {
      mode: undefined,
    });
  });

  it('should add same-origin mode for repository/archive endpoint', async () => {
    MockFetch.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(JSON.stringify({})),
        ok: true,
        status: 200,
        headers: {
          entries() {
            return [['content-type', 'application/json']];
          },
          get() {
            return 'application/json';
          },
        },
      }),
    );

    await defaultRequestHandler('http://test.com/repository/archive');

    expect(MockFetch).toHaveBeenCalledWith(new URL('http://test.com/repository/archive'), {
      mode: 'same-origin',
    });
  });

  it('should use default mode (cors) for non-repository/archive endpoints', async () => {
    MockFetch.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(JSON.stringify({})),
        ok: true,
        status: 200,
        headers: {
          entries() {
            return [['content-type', 'application/json']];
          },
          get() {
            return 'application/json';
          },
        },
      }),
    );

    await defaultRequestHandler('http://test.com/test/something');

    expect(MockFetch).toHaveBeenCalledWith(new URL('http://test.com/test/something'), {
      mode: undefined,
    });
  });

  it('should handle multipart prefixUrls correctly', async () => {
    MockFetch.mockReturnValue(
      Promise.resolve({
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(JSON.stringify({})),
        ok: true,
        status: 200,
        headers: {
          entries() {
            return [['content-type', 'application/json']];
          },
          get() {
            return 'application/json';
          },
        },
      }),
    );

    await defaultRequestHandler('testurl/123', {
      searchParams: 'test=4',
      prefixUrl: 'http://test.com/projects',
    } as RequestOptions);

    expect(MockFetch).toHaveBeenCalledWith(new URL('http://test.com/projects/testurl/123?test=4'), {
      mode: undefined,
    });

    await defaultRequestHandler('123/testurl', {
      searchParams: 'test=4',
      prefixUrl: 'http://test.com/projects',
    } as RequestOptions);

    expect(MockFetch).toHaveBeenCalledWith(new URL('http://test.com/projects/123/testurl?test=4'), {
      mode: undefined,
    });

    await defaultRequestHandler('123/testurl', {
      searchParams: 'test=4',
      prefixUrl: 'http://test.com/projects/',
    } as RequestOptions);

    expect(MockFetch).toHaveBeenCalledWith(new URL('http://test.com/projects/123/testurl?test=4'), {
      mode: undefined,
    });
  });
});

describe('defaultRequest', () => {
  const service = {
    headers: { test: '5' },
    url: 'testurl',
    rejectUnauthorized: true,
  };

  it('should not assign the agent property if given https url and not rejectUnauthorized', async () => {
    const { agent } = await defaultOptionsHandler(
      { ...service, url: 'https://test.com' },
      { method: 'post' },
    );

    expect(agent).toBeUndefined();
  });

  it('should not assign the agent property if given http url and rejectUnauthorized', async () => {
    const { agent } = await defaultOptionsHandler(
      { ...service, url: 'http://test.com' },
      { method: 'post' },
    );

    expect(agent).toBeUndefined();
  });

  it('should assign the agent property if given https url and rejectUnauthorized is false', async () => {
    const { agent: agent1 } = await defaultOptionsHandler(
      { ...service, url: 'https://test.com', rejectUnauthorized: false },
      { method: 'post' },
    );

    expect(agent1).toBeDefined();

    const { agent: agent2 } = await defaultOptionsHandler(
      { ...service, url: 'https://test.com', rejectUnauthorized: true },
      { method: 'post' },
    );

    expect(agent2).toBeUndefined();

    const { agent: agent3 } = await defaultOptionsHandler(
      { ...service, url: 'https://test.com' },
      { method: 'post' },
    );

    expect(agent3).toBeUndefined();
  });
});
