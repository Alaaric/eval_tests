// Config Babel utilisée UNIQUEMENT par Jest (Vite utilise esbuild, pas Babel).
// Vite transforme `import.meta.env` nativement ; sous Jest (CommonJS) cette
// syntaxe n'existe pas, d'où le petit plugin local qui remplace `import.meta`
// par `{ env: process.env }` afin que cdService.js soit exécutable en test.
module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
  ],
  plugins: [
    function importMetaEnvPlugin() {
      return {
        visitor: {
          MetaProperty(path) {
            path.replaceWithSourceString("({ env: process.env })");
          },
        },
      };
    },
  ],
};
