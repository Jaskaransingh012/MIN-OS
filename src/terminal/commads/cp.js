export default class CopyCommand {
  constructor(kernel) {
    this.fileSystem = kernel.getService("fileSystem");
  }

  async _execute(args) {
    try {
      if (args.length < 2) {
        throw new Error("Require copy source as well as destination");
      }

      await this.fileSystem.copyFile(args[0], args[1]);

      return `File successfully copied to ${args[1]}`;
    } catch (error) {
      return error.message;
    }
  }
}
