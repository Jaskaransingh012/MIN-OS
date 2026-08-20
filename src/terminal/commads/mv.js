export default class MoveCommand {
  constructor(kernel) {
    this.fileSystem = kernel.getService("fileSystem");
  }

  async _execute(args) {
    try {
      if (args.length < 2) {
        throw new Error("Require copy source as well as destination");
      }

      await this.fileSystem.moveFile(args[0], args[1]);


    } catch (error) {
      return error.message;
    }
  }
}
