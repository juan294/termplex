export function bashCompletion(): string {
  return `\
_termplex_completions() {
    local cur="\${COMP_WORDS[COMP_CWORD]}"
    local prev="\${COMP_WORDS[COMP_CWORD-1]}"

    local subcommands="add remove list set config completion"
    local flags="--help --version --force --layout --editor --panes --editor-size --sidebar --server --mouse --no-mouse -h -v -f -l"
    local config_keys="editor sidebar panes editor-size server mouse layout"
    local presets="minimal full pair cli mtop"

    local projects=""
    if [[ -f "\${HOME}/.config/termplex/projects" ]]; then
        projects=$(cut -d= -f1 "\${HOME}/.config/termplex/projects")
    fi

    if [[ \${COMP_CWORD} -eq 1 ]]; then
        COMPREPLY=($(compgen -W "\${subcommands} \${projects} ." -- "\${cur}"))
        return
    fi

    local subcmd="\${COMP_WORDS[1]}"

    case "\${subcmd}" in
        remove)
            COMPREPLY=($(compgen -W "\${projects}" -- "\${cur}"))
            ;;
        set)
            if [[ \${COMP_CWORD} -eq 2 ]]; then
                COMPREPLY=($(compgen -W "\${config_keys}" -- "\${cur}"))
            elif [[ \${COMP_CWORD} -eq 3 && "\${prev}" == "layout" ]]; then
                COMPREPLY=($(compgen -W "\${presets}" -- "\${cur}"))
            fi
            ;;
        add|list|config|completion)
            ;;
        *)
            case "\${prev}" in
                --layout|-l)
                    COMPREPLY=($(compgen -W "\${presets}" -- "\${cur}"))
                    ;;
                --editor|--panes|--editor-size|--sidebar|--server)
                    ;;
                *)
                    COMPREPLY=($(compgen -W "\${flags}" -- "\${cur}"))
                    ;;
            esac
            ;;
    esac
}

complete -F _termplex_completions termplex
complete -F _termplex_completions ws`;
}

export function zshCompletion(): string {
  return `\
_termplex() {
    local -a subcommands flags config_keys presets projects

    subcommands=(add remove list set config completion)
    flags=(--help --version --force --layout --editor --panes --editor-size --sidebar --server --mouse --no-mouse -h -v -f -l)
    config_keys=(editor sidebar panes editor-size server mouse layout)
    presets=(minimal full pair cli mtop)

    if [[ -f "\${HOME}/.config/termplex/projects" ]]; then
        projects=(\${(f)"$(cut -d= -f1 "\${HOME}/.config/termplex/projects")"})
    fi

    if (( CURRENT == 2 )); then
        _alternative \\
            'subcommands:subcommand:compadd -a subcommands' \\
            'projects:project:compadd -a projects' \\
            'special:special:compadd .'
        return
    fi

    local subcmd="\${words[2]}"

    case "\${subcmd}" in
        remove)
            compadd -a projects
            ;;
        set)
            if (( CURRENT == 3 )); then
                compadd -a config_keys
            elif (( CURRENT == 4 )) && [[ "\${words[3]}" == "layout" ]]; then
                compadd -a presets
            fi
            ;;
        add|list|config|completion)
            ;;
        *)
            case "\${words[CURRENT-1]}" in
                --layout|-l)
                    compadd -a presets
                    ;;
                --editor|--panes|--editor-size|--sidebar|--server)
                    ;;
                *)
                    compadd -a flags
                    ;;
            esac
            ;;
    esac
}

compdef _termplex termplex
compdef _termplex ws`;
}

export function fishCompletion(): string {
  const subcommands = "add remove list set config completion";
  const noSubcmd = `not __fish_seen_subcommand_from ${subcommands}`;
  const lines: string[] = [];

  for (const cmd of ["termplex", "ws"]) {
    lines.push(`# Completions for ${cmd}`);

    // Subcommands (when no subcommand yet)
    lines.push(`complete -c ${cmd} -n "${noSubcmd}" -f -a "add" -d "Register a project"`);
    lines.push(`complete -c ${cmd} -n "${noSubcmd}" -f -a "remove" -d "Remove a project"`);
    lines.push(`complete -c ${cmd} -n "${noSubcmd}" -f -a "list" -d "List projects"`);
    lines.push(`complete -c ${cmd} -n "${noSubcmd}" -f -a "set" -d "Set config value"`);
    lines.push(`complete -c ${cmd} -n "${noSubcmd}" -f -a "config" -d "Show config"`);
    lines.push(`complete -c ${cmd} -n "${noSubcmd}" -f -a "completion" -d "Output completion script"`);
    lines.push(`complete -c ${cmd} -n "${noSubcmd}" -f -a "(cut -d= -f1 ~/.config/termplex/projects 2>/dev/null)" -d "project"`);
    lines.push(`complete -c ${cmd} -n "${noSubcmd}" -f -a "." -d "Current directory"`);

    // remove subcommand — complete with project names
    lines.push(`complete -c ${cmd} -n "__fish_seen_subcommand_from remove" -f -a "(cut -d= -f1 ~/.config/termplex/projects 2>/dev/null)" -d "project"`);

    // set subcommand — complete with config keys
    lines.push(`complete -c ${cmd} -n "__fish_seen_subcommand_from set" -f -a "editor sidebar panes editor-size server mouse layout"`);

    // Flags
    lines.push(`complete -c ${cmd} -s h -l help -d "Show help"`);
    lines.push(`complete -c ${cmd} -s v -l version -d "Show version"`);
    lines.push(`complete -c ${cmd} -s f -l force -d "Force recreate session"`);
    lines.push(`complete -c ${cmd} -s l -l layout -rf -a "minimal full pair cli mtop" -d "Layout preset"`);
    lines.push(`complete -c ${cmd} -l editor -rf -d "Editor command"`);
    lines.push(`complete -c ${cmd} -l panes -rf -d "Number of editor panes"`);
    lines.push(`complete -c ${cmd} -l editor-size -rf -d "Editor width %%"`);
    lines.push(`complete -c ${cmd} -l sidebar -rf -d "Sidebar command"`);
    lines.push(`complete -c ${cmd} -l server -rf -d "Server pane"`);
    lines.push(`complete -c ${cmd} -l mouse -d "Enable mouse mode"`);
    lines.push(`complete -c ${cmd} -l no-mouse -d "Disable mouse mode"`);

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
