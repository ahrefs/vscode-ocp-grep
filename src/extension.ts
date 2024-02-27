// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import path from "path";
import { execSync } from "child_process";
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
      const command = `cd ${rootPath} && eval $(opam env) && ocp-grep "${lookupStr}"`;

      const results = await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: "Searching for references...",
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0 });

          let results = await execSync(command)
            .toString()
            .split("\n")
            .filter((x) => x !== "");

          progress.report({ increment: 100 });

          return results;
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

// This method is called when your extension is deactivated
export async function deactivate() {}
