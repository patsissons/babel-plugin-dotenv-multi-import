import {existsSync} from 'fs';
import dotenv, {DotenvConfigOutput, DotenvParseOutput} from 'dotenv';
import dotenvExpand from 'dotenv-expand';

export interface ParseOptions {
  blacklist?: string[];
  debug?: boolean;
}

export interface Options extends ParseOptions {
  basePath?: string;
  encoding?: string;
}

export const defaultBasePath = '.env';

export function paths(basePath = defaultBasePath, blacklist: string[] = []) {
  // eslint-disable-next-line no-process-env
  const nodeEnv = process.env.NODE_ENV;

  if (!nodeEnv) {
    // eslint-disable-next-line no-console
    console.warn('The NODE_ENV environment variable was not specified.');
  }

  return [
    nodeEnv && `${basePath}.${nodeEnv}.local`,
    nodeEnv && `${basePath}.${nodeEnv}`,
    // Don't include `.env.local` for `test` environment
    // since normally you expect tests to produce the same
    // results for everyone
    nodeEnv !== 'test' && `${basePath}.local`,
    basePath,
  ].filter(
    (path): path is string =>
      !path || blacklist.includes(path) ? false : existsSync(path),
  );
}

export function config({
  basePath,
  blacklist,
  ...options
}: Options): DotenvConfigOutput[] {
  return paths(basePath, blacklist).map((path) =>
    dotenvExpand(dotenv.config({path, ...options})),
  );
}

export function merge(output: DotenvParseOutput[]) {
  return output.reduceRight((env, parsed) => ({...env, parsed}), {});
}

export function parse(
  basePath?: string,
  {blacklist, ...options}: ParseOptions = {},
): DotenvParseOutput[] {
  return paths(basePath, blacklist).map((path) => dotenv.parse(path, options));
}

export default {
  paths,
  config,
  merge,
  parse,
};
