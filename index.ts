import {PluginObj} from 'babel-core';

import {config, merge, parse} from './dotenv-multi';

export interface Options {
  allowUndefined?: boolean;
  basePath?: string;
  blacklist?: string[];
  debug?: boolean;
  encoding?: string;
  moduleName?: string;
  safe?: boolean;
}

export interface State {
  opts: Options;
  env: any;
}

export const defaultModuleName = '@env';

export default function plugin({types}: any): PluginObj<State> {
  return {
    name: 'multi-dotenv-import',
    pre() {
      const {basePath, blacklist, debug, encoding, safe} = this.opts;

      if (safe) {
        this.env = merge(parse(basePath, {blacklist, debug}));
      } else {
        config({basePath, blacklist, debug, encoding});

        // eslint-disable-next-line no-process-env
        this.env = process.env;
      }
    },
    visitor: {
      ImportDeclaration(path) {
        function codeFrameError(index: number, message: string) {
          return path.get('specifiers')[index].buildCodeFrameError(message);
        }

        const {node, scope} = path;
        const {allowUndefined, moduleName = defaultModuleName} = this.opts;

        if (node.source.value === moduleName) {
          node.specifiers.forEach((specifier, index) => {
            if (specifier.type === 'ImportDefaultSpecifier') {
              throw codeFrameError(index, 'Default import is not supported');
            }

            if (specifier.type === 'ImportNamespaceSpecifier') {
              throw codeFrameError(index, 'Wildcard import is not supported');
            }

            const importedId = specifier.imported.name;
            const localId = specifier.local.name;

            if (!allowUndefined && !(importedId in this.env)) {
              throw codeFrameError(
                index,
                `"${importedId}" is not defined (consider setting "allowUndefined" option)`,
              );
            }

            const binding = scope.getBinding(localId);

            if (binding) {
              binding.referencePaths.forEach((refPath) => {
                refPath.replaceWith(types.valueToNode(this.env[importedId]));
              });
            }
          });

          path.remove();
        }
      },
    },
  };
}
