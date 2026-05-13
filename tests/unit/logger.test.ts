/* eslint-env jest */
import {
  logger,
  logStream,
  logRequest,
  logResponse,
  testLogging,
} from '../../utils/logger';

describe('logger module', () => {
  it('exports a winston logger', () => {
    expect(typeof logger.info).toBe('function');
  });

  it('logStream.write logs trimmed messages', () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    logStream.write('  hello \n');
    expect(spy).toHaveBeenCalledWith('hello');
    spy.mockRestore();
  });

  it('logRequest captures structured request meta', () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    logRequest({
      method: 'GET',
      url: '/x',
      headers: { 'user-agent': 'jest' },
      connection: { remoteAddress: '127.0.0.1' },
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logResponse captures duration and status', () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    logResponse({ statusCode: 200 }, 42);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('testLogging exercises all log levels without throwing', () => {
    const info = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
    const err = jest.spyOn(logger, 'error').mockImplementation(() => logger);
    const debug = jest.spyOn(logger, 'debug').mockImplementation(() => logger);

    expect(() => testLogging()).not.toThrow();
    expect(info).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    expect(err).toHaveBeenCalled();
    expect(debug).toHaveBeenCalled();

    info.mockRestore();
    warn.mockRestore();
    err.mockRestore();
    debug.mockRestore();
  });
});
