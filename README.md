# ocp-grep README

POC of extension that uses `ocp-grep` to quickly find usages of selected ident in OCaml code.

There is no parser, so the command uses active file name and whatever is selected to construct grep string. So, if your ident is not on root level, you have to add remaning modules yourself.


## How to use

Specify full path to `ocp-grep` binary in your settings:

```json
{
  ...
  "ocp-grep": {
    "path": "/Users/rusty/.opam/5.1.1/bin/ocp-grep"
  }
}
```
