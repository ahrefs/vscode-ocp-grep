import * as vscode from "vscode";
import path from "path";
import { ExecException, execSync } from "child_process";
import { ProgressLocation, window } from "vscode";

let log = vscode.window.createOutputChannel("ocp-grep");

let getModuleName = (fileName: String) => {
  const fileNameWithoutPath = fileName.split("/").pop();
  const fileNameWithoutExtension = fileNameWithoutPath
    ?.split(".")
    .slice(0, -1)
    .join(".");
  if (!fileNameWithoutExtension) return "";

  return fileNameWithoutExtension.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

let getBinary = () => {
  const config = vscode.workspace.getConfiguration("ocp-grep");

  return config.get<string | undefined>("path");
};

export async function activate(context: vscode.ExtensionContext) {
  console.log("ocp-grep is now active!");

  let disposable = vscode.commands.registerCommand(
    "ocp-grep.findReferences",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const selectedText = editor.document.getText(editor.selection);
      const moduleName = getModuleName(editor.document.fileName);
      const lookupStr = `${moduleName}.${selectedText}`;

      const rootPath = vscode.workspace.rootPath || "";
      const binary = getBinary();

      if (!binary) {
        vscode.window.showErrorMessage(
          "ocp-grep: Binary path not found. Please set it in the settings."
        );
        return;
      }
      const command = `cd ${rootPath} && ${binary} --color=always "${lookupStr}"`;

      const results = await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: "Searching for references...",
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0 });

          try {
            let results = await execSync(command)
              .toString()
              .split("\n")
              .filter((x) => x !== "")
              .map((x) => x.replace(/\x1b\[[0-9;]*m/g, ""));

            progress.report({ increment: 100 });

            return results;
          } catch (e: any) {
            log.appendLine(e.message);
            vscode.window.showErrorMessage(
              "ocp-grep: An error occured. Check the logs for more details."
            );
            return [];
          }
        }
      );

      const userPick = await vscode.window.showQuickPick(results, {
        placeHolder: "Choose an option",
      });

      if (!userPick) return;

      const [file, line] = userPick.split(":");

      vscode.commands
        .executeCommand(
          "vscode.open",
          vscode.Uri.file(path.join(rootPath, file))
        )
        .then(() => {
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            const position = new vscode.Position(Number(line) - 1, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(
              new vscode.Range(position, position),
              vscode.TextEditorRevealType.InCenter
            );
          }
        });
    }
  );

  context.subscriptions.push(disposable);
}

export async function deactivate() {}
