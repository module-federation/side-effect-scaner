export default class {
  // @ts-ignore
    apply(compiler){
  // @ts-ignore
    compiler.hooks.compilation.tap('ExamplePlugin', compilation => {
      console.log('compilation created:', compilation);
  // @ts-ignore
      compilation.hooks.finishModules.tap('ExamplePlugin2', (compilation,mm) => {
        debugger
        console.log("compilation's finishModules hook called:", compilation);
        console.log(mm)
      });
    });
    }
}