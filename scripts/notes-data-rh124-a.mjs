/**
 * notes-data-rh124-a.mjs — RH124 Part 0 and Chapters 1-5
 *
 * Plain-English notes in the six-part shape the learner set as the template:
 *   Main idea -> Simple explanation -> Example -> What each part means -> Remember
 *
 * These sit BESIDE the full chapter text, never instead of it. The chapter view
 * links straight to the original; these give the understanding.
 *
 * CURRENCY NOTE, applies to this whole book
 * The source guide is written for RHEL 8. The exam target (EX200) is based on
 * RHEL 10, and the notes here were checked against a live RHEL 10.2 host. The
 * core of RH124 has not moved between those releases — the notes flag the few
 * places where it matters rather than quietly rewriting the source.
 */

/** @typedef {{n:number,title:string,main:string,simple:string[],example?:string[],parts?:[string,string][],remember:string,warning?:string}} Concept */

export const RH124_NOTES_A = [
  /* ================================================== Part 0 — the lab */
  {
    id: "rh124-01",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 0,
    title: "Building Your Practice Lab",
    partTitle: "Part 0 — standing up the virtual machines you will practise on",
    exam: "RHCSA (EX200) — no direct objective; this is the lab everything else runs in",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "Part 1 — Planning the lab",
        concepts: [
          {
            n: 1,
            title: "Why build a lab at all",
            main: "Every command in this book is safe to try only on a machine you built yourself and can throw away.",
            simple: [
              "Think of it as a practice room. You learn to drive a car by driving badly on a closed track first, not in live traffic.",
              "If you practise `rm -rf` or a bad partition table on a real machine, there is no undo. On a cloned VM, you snapshot and restore in a minute."
            ],
            parts: [
              ["the lab", "isolated virtual machines on your own workstation."],
              ["the risk", "a wrong command on a real server is permanent."],
              ["the benefit", "mistakes cost you a snapshot restore, not a rebuild."]
            ],
            remember: "Practise only where a mistake is cheap."
          },
          {
            n: 2,
            title: "The network plan",
            main: "You decide the addresses up front, on paper, so every machine can be built without guessing later.",
            simple: [
              "Write down each machine's name, its address, and which network it sits on before building anything.",
              "Keeping a written plan is what stops you giving two machines the same address an hour in."
            ],
            example: [
              "workstation   192.168.1.100",
              "servera       192.168.1.101   .1.0/24",
              "serverb       192.168.1.102",
              "bastion/rtr   192.168.1.1  and  192.168.2.1",
              "servera/b     192.168.2.101 / .102   .2.0/24"
            ],
            parts: [
              [".1.0/24", "the first network — your workstation and two servers."],
              [".2.0/24", "the second network — reached only through the router."],
              ["bastion", "the jump host; the router sits on both networks."]
            ],
            remember: "Plan the addresses on paper first; guessing later causes duplicates."
          }
        ]
      },
      {
        title: "Part 2 — Getting RHEL and building the machines",
        concepts: [
          {
            n: 3,
            title: "Getting RHEL for free, legitimately",
            main: "Red Hat offers free subscription routes that give you the real RHEL, not a rebuild.",
            simple: [
              "You do not need to buy anything to learn on the genuine product. Red Hat publishes free subscription options specifically for developers, students and individual use.",
              "It matters that it is the real RHEL: the files, paths and behaviour you practise are the ones you will meet on the job."
            ],
            parts: [
              ["developer subscription", "a free account that gives access to real RHEL packages."],
              ["student", "free via educational programmes."],
              ["why the real thing", "what you practise matches production behaviour."]
            ],
            remember: "The free subscriptions give you genuine RHEL — not a lookalike rebuild."
          },
          {
            n: 4,
            title: "Build one machine, then clone it",
            main: "You install RHEL once into a 'gold' machine and clone it, because installing five times is slow and gives five slightly different machines.",
            simple: [
              "Make one perfect machine. Take copies of it for everything else.",
              "This guarantees all your lab machines behave identically, and it takes minutes rather than an afternoon per machine."
            ],
            example: ["shut down the gold VM", "take 4 clones from the same snapshot"],
            parts: [
              ["the gold VM", "the one you install and configure properly, once."],
              ["clone", "a copy of it — fast, and identical every time."],
              ["why", "consistency, and five installs become one."]
            ],
            remember: "Install once, clone many — that is what makes the lab fast and consistent."
          },
          {
            n: 5,
            title: "The one thing this lab cannot reproduce",
            main: "A lab of virtual machines has no real hardware failures, so some skills can only be read, not practised here.",
            simple: [
              "You cannot pull a real disk out of a virtual machine. Disk failure, some hardware faults and true physical cabling are outside what a lab can teach.",
              "Knowing the boundary is useful: it tells you which skills need real hardware later, instead of assuming you are covered."
            ],
            remember: "A lab cannot teach real hardware failure — know where its limits are."
          }
        ]
      }
    ],
    revision: [
      ["Plan addresses before building", "write them down on paper"],
      ["Build one machine, clone the rest", "clone from a snapshot"],
      ["Snapshot a known-good baseline", "so you can always return"]
    ],
    inOneSentence: "Plan the addresses, install RHEL once into a gold machine, clone it, and snapshot — then practise freely because mistakes are cheap."
  },

  /* ================================== Ch 1 — getting started with RHEL */
  {
    id: "rh124-02",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 1,
    title: "Getting Started with Red Hat Enterprise Linux",
    partTitle: "Chapter 1 — what Linux is, what RHEL adds, and why the community rebuilds differ",
    exam: "RHCSA (EX200) — conceptual, no direct objective",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "Why learn Linux, and what makes it different",
        concepts: [
          {
            n: 1,
            title: "Why bother learning Linux",
            main: "Linux quietly runs most of the internet, most cloud instances and almost all networking equipment you rely on.",
            simple: [
              "When you open a website or use an app, a Linux server is very likely answering. That includes the routers, firewalls and phones around you.",
              "Learning it is learning the machine most systems are actually built on."
            ],
            remember: "Most of what the internet is made of runs on Linux."
          },
          {
            n: 2,
            title: "Three traits that made Linux everywhere",
            main: "Open source, runs on everything, and free of per-seat licence costs.",
            simple: [
              "Anyone can read the code, change it, and give the changes back. That means problems get fixed by many people instead of one vendor.",
              "It runs on anything from a phone to a room-sized server. And because there is no licence fee per machine, running thousands of copies costs nothing extra."
            ],
            parts: [
              ["open source", "anyone may read, change and redistribute the code."],
              ["runs on everything", "same system on a phone and on a server."],
              ["no per-seat cost", "running 1 or 10,000 machines costs the same licence-wise."]
            ],
            remember: "Open source, runs everywhere, no per-seat cost — that is why Linux won."
          }
        ]
      },
      {
        title: "Kernel, distribution, RHEL",
        concepts: [
          {
            n: 3,
            title: "From kernel to distribution",
            main: "The kernel manages hardware; a distribution is the kernel plus everything else you need to actually use it.",
            simple: [
              "The kernel is the engine — it controls memory, processes and hardware. On its own it is not a usable system.",
              "A distribution bundles the kernel with the installer, the package manager, the text editor, the shell and thousands of tools, all tested together.",
              "Think of the kernel as the engine and the distribution as the whole car."
            ],
            parts: [
              ["kernel", "hardware, memory and process scheduling — the engine."],
              ["distribution", "kernel + installer + tools, tested together — the whole car."],
              ["RHEL", "Red Hat's distribution, sold with a support contract."]
            ],
            remember: "The kernel is the engine; the distribution is the whole car."
          },
          {
            n: 4,
            title: "RHEL versus the community rebuilds",
            main: "RHEL is the original commercial product; CentOS Stream, Rocky and AlmaLinux rebuild its source freely, with trade-offs in support and release timing.",
            simple: [
              "Rebuilds compile the same source packages Red Hat publishes. The code is largely the same.",
              "The difference is around it: Red Hat provides a tested combination with a support contract and a defined lifecycle. Rebuilds are free, but you get no Red Hat support and sometimes a slightly different release schedule."
            ],
            parts: [
              ["RHEL", "the original, with a support contract and defined lifecycle."],
              ["rebuilds", "free, compiled from the same source, no Red Hat support."],
              ["CentOS Stream", "tracks *upstream* — it shows what will be in the next RHEL, not what is in the current one."]
            ],
            remember: "Rebuilds are free and near-identical, but you get no Red Hat support."
          }
        ]
      }
    ],
    revision: [
      ["Kernel vs distribution", "kernel = engine, distribution = whole car"],
      ["RHEL's advantage", "tested combination + support contract + lifecycle"],
      ["CentOS Stream's role", "shows what is coming in the NEXT RHEL"]
    ],
    inOneSentence: "The kernel is only the engine; RHEL is the whole tested car with a support contract, and the rebuilds are free copies with the same code but no support."
  },

  /* ==================================== Ch 2 — accessing the command line */
  {
    id: "rh124-03",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 2,
    title: "Accessing the Command Line",
    partTitle: "Chapter 2 — the shell, the prompt, and working efficiently in Bash",
    exam: "RHCSA (EX200) — 1.1-1.4 command-line fundamentals",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "The shell and the prompt",
        concepts: [
          {
            n: 1,
            title: "What the shell is",
            main: "The shell is the program that reads what you type and runs it.",
            simple: [
              "The shell sits between you and the kernel. You type a command; the shell works out which program you mean, runs it, and shows you the output.",
              "RHEL's default is bash, the GNU Bourne-Again Shell."
            ],
            parts: [
              ["bash", "RHEL's default shell."],
              ["prompt", "the text showing who you are and where you are."],
              ["[user@host ~]$", "user, hostname, current directory, then # for root or $ for a normal user."]
            ],
            remember: "The shell reads your command and runs it; # means root, $ means normal user."
          },
          {
            n: 2,
            title: "How a command is put together",
            main: "Every command has the same three parts: the command, its options, and its arguments.",
            simple: [
              "Like a sentence: the command is the verb, options are adverbs, arguments are the nouns it acts on.",
              "Once you see this pattern, every command looks like every other command."
            ],
            example: ["ls -l /etc/passwd"],
            parts: [
              ["ls", "the command — the verb."],
              ["-l", "an option — how to do it."],
              ["/etc/passwd", "an argument — what to do it to."]
            ],
            remember: "command + options + arguments — the same shape every time."
          },
          {
            n: 3,
            title: "Logging in over the network",
            main: "ssh user@host gives you a remote shell as if you were sitting at that machine.",
            simple: [
              "The same account and password works, but the keyboard and screen are the other machine's. Everything after you log in is identical.",
              "From a lab workstation this is how you reach servera and serverb."
            ],
            example: ["ssh student@servera"],
            parts: [
              ["ssh", "the command — secure remote shell."],
              ["student", "the account to log in as."],
              ["servera", "the machine to reach."]
            ],
            remember: "ssh user@host puts you at that machine's keyboard, not on a different system."
          }
        ]
      },
      {
        title: "Working efficiently in Bash",
        concepts: [
          {
            n: 4,
            title: "The shortcuts worth memorising",
            main: "A few keys save more time in an exam than anything else you could learn.",
            simple: [
              "Most of these are not exam objectives on their own, but each one turns a slow, error-prone sequence into one or two keystrokes."
            ],
            example: [
              "!!            repeat the previous command",
              "!$            last argument of the previous command",
              "Tab           complete a filename or command",
              "Ctrl+a / Ctrl+e   jump to start / end of the line",
              "Ctrl+u        delete from cursor back to the start",
              "Ctrl+c        abandon the current command",
              "Ctrl+r        search backwards through history",
              "Up/Down       walk through previous commands",
              "Ctrl+l        clear the screen"
            ],
            parts: [
              ["Tab", "the single biggest time-saver — complete instead of typing."],
              ["Ctrl+r", "search your whole command history by typing part of it."],
              ["Ctrl+c", "get out of a command that is waiting for input."]
            ],
            remember: "Tab to complete, Ctrl+r to search history, Ctrl+c to escape — those three pay for themselves."
          },
          {
            n: 5,
            title: "Understanding history expansion",
            main: "The shell keeps your commands, and ! lets you reuse them without retyping.",
            simple: [
              "Typing `!!` re-runs the previous command. Typing `!$` inserts the last argument of the previous command, which saves retyping long paths."
            ],
            example: ["mkdir -p /tmp/project/logs", "cd !$"],
            parts: [
              ["history", "the list of what you have run."],
              ["!!", "the previous command, whole."],
              ["!$", "the last argument of the previous command."]
            ],
            remember: "!! repeats the last command, !$ reuses its last argument."
          }
        ]
      }
    ],
    revision: [
      ["Log in remotely", "ssh user@host"],
      ["Complete a name", "Tab"],
      ["Search history", "Ctrl+r"],
      ["Repeat last command", "!!"],
      ["Abandon a command", "Ctrl+c"]
    ],
    inOneSentence: "The shell runs what you type; every command is verb + options + nouns; and Tab, Ctrl+r and Ctrl+c are the shortcuts that buy back the most time."
  },

  /* ================================ Ch 3 — managing files from the command line */
  {
    id: "rh124-04",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 3,
    title: "Managing Files from the Command Line",
    partTitle: "Chapter 3 — paths, creating and removing files, links, and shell expansions",
    exam: "RHCSA (EX200) — 2.1-2.5 file and directory management",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "Paths and moving around",
        concepts: [
          {
            n: 1,
            title: "The file-system hierarchy",
            main: "Everything starts at one root directory, /, and everything else hangs from it.",
            simple: [
              "There is no drive letter and no C:. One top folder, and every file and folder lives somewhere below it.",
              "It is a single tree, which is why an absolute path always begins with /."
            ],
            parts: [
              ["/", "the root — the one folder everything starts from."],
              ["/etc", "system-wide configuration files."],
              ["/var", "variable data — logs and caches that change."],
              ["/home", "user home directories."],
              ["/root", "root's home directory."]
            ],
            remember: "One root, /, and every path starts from it."
          },
          {
            n: 2,
            title: "Absolute versus relative paths",
            main: "An absolute path starts at the root; a relative path starts where you already are.",
            simple: [
              "Absolute paths are like a full street address. Relative paths are like 'two streets past the bakery, turn left' — they only work from one starting point.",
              "The dot . means 'here' and two dots .. mean 'the folder above'."
            ],
            example: ["cd /etc", "cd ..", "cd ../..", "cd -"],
            parts: [
              ["/etc/passwd", "absolute — the full address from the root."],
              ["passwd", "relative — the same file only if you are already in /etc."],
              [".", "the current directory."],
              ["..", "the parent directory — one level up."],
              ["cd -", "return to the directory you were in last."]
            ],
            remember: "Absolute starts at /, relative starts at where you are."
          }
        ]
      },
      {
        title: "Creating, copying, moving and removing",
        concepts: [
          {
            n: 3,
            title: "Creating and copying",
            main: "touch makes an empty file, mkdir makes a folder, and cp copies one to another.",
            simple: [
              "Three separate verbs for three separate jobs. Learning them apart saves guessing."
            ],
            example: ["touch notes.txt", "mkdir project", "mkdir -p project/logs", "cp notes.txt project/"],
            parts: [
              ["touch FILE", "create an empty file if it does not exist."],
              ["mkdir DIR", "create a directory."],
              ["-p", "with mkdir, create parent folders too instead of failing."],
              ["cp SOURCE DEST", "copy."],
              ["cp -r DIR DEST", "copy a whole folder, recursively."]
            ],
            remember: "touch for files, mkdir for folders, and -p builds the path."
          },
          {
            n: 4,
            title: "Moving and renaming",
            main: "mv both moves a file and renames it, depending on what you point it at.",
            simple: [
              "One command does two jobs. If the destination is a new name in the same place, it renames. If it is a folder, it moves."
            ],
            example: ["mv old.txt new.txt", "mv notes.txt project/"],
            parts: [
              ["mv A B", "rename A to B."],
              ["mv A dir/", "move A into that folder."]
            ],
            remember: "mv renames when the target is a new name, moves when it is a folder."
          },
          {
            n: 5,
            title: "Removing files and folders",
            main: "rm removes files, rm -r removes folders and their contents.",
            simple: [
              "rm does not ask. There is no 'are you sure' and no undo — a deleted file is gone unless it is a snapshot.",
              "This is the command to slow down and re-read before pressing Enter."
            ],
            example: ["rm notes.txt", "rm -r project", "rm -rf project"],
            parts: [
              ["rm FILE", "delete a file."],
              ["rm -r DIR", "delete a folder and everything in it."],
              ["-f", "force — suppress the prompt that could save you."],
              ["rm -rf", "both together: no prompt, recursive, immediate."]
            ],
            remember: "rm -rf deletes permanently with no confirmation and no undo.",
            warning: "There is no confirmation prompt and no undo on rm. Read the path twice. In a lab, snapshot first."
          }
        ]
      },
      {
        title: "Links",
        concepts: [
          {
            n: 6,
            title: "Hard links versus soft links",
            main: "A hard link is another name for the same file; a soft link is a shortcut that points at it.",
            simple: [
              "A hard link is like giving someone a second key to the same door. The file has not moved and neither copy can tell it is a copy — delete one and the data is still there.",
              "A soft link is a signpost. It stores only the path. If the original file is deleted or moved, the signpost points nowhere.",
              "This is the important difference: hard links break when the file is renamed; soft links break when the file is deleted or moved."
            ],
            example: ["ln original.txt hardlink.txt", "ln -s original.txt softlink.txt"],
            parts: [
              ["ln SOURCE NAME", "create a hard link — a second name for the same data."],
              ["ln -s SOURCE NAME", "create a soft link — a shortcut storing a path."],
              ["ls -i FILE", "shows the inode; two hard links share one inode number."],
              ["hard link survives rm", "the data stays, because another name points to it."],
              ["soft link breaks", "if the target is removed or moved, the link points to nothing."]
            ],
            remember: "Hard link = same data, survives deletion; soft link = a path, breaks if the target moves."
          }
        ]
      },
      {
        title: "Shell expansions and quoting",
        concepts: [
          {
            n: 7,
            title: "Pattern, brace and variable expansion",
            main: "The shell can expand * and ? into filenames, {a,b} into lists, and $NAME into values — before the command even runs.",
            simple: [
              "Your command never sees the asterisk. The shell replaces it with matching filenames first, then runs the command on the results.",
              "Globbing matches names. Brace expansion builds lists of anything — it is not limited to files."
            ],
            example: ["ls *.txt", "rm /tmp/*.log", "mkdir -p test/{a,b,c}", "echo $HOME"],
            parts: [
              ["*", "any characters."],
              ["?", "exactly one character."],
              ["[a-z]", "one character from a range."],
              ["{a,b,c}", "brace expansion — builds a comma-separated list."],
              ["{1..5}", "brace expansion — builds a numeric range."],
              ["$HOME", "variable expansion."],
              ["$(command)", "command substitution — use a command's output in place."]
            ],
            remember: "The shell expands globs and braces before the command runs — never type a literal * you did not mean."
          },
          {
            n: 8,
            title: "Quoting and why it matters",
            main: "Quotes stop the shell from expanding things. Use them whenever a name contains a space or a special character.",
            simple: [
              "Without quotes the shell sees each space as a separate argument and each * as a wildcard.",
              "With quotes the shell hands the text to the command exactly as you typed it."
            ],
            example: ["touch \"my report.txt\"", "rm 'file with spaces.txt'"],
            parts: [
              ["'single quotes'", "everything is literal — no expansion at all."],
              ["\"double quotes\"", "keeps spaces together but still expands $ and *."],
              ["\\backslash", "escape just the next character."],
              ["no quotes", "the shell splits on spaces and expands wildcards."]
            ],
            remember: "Quote anything with a space or a * in the name.",
            warning: "An unquoted variable holding a path with spaces turns one argument into two, and the command fails in a confusing way."
          }
        ]
      }
    ],
    revision: [
      ["Create a file / folder", "touch FILE  /  mkdir DIR"],
      ["Create a whole path", "mkdir -p a/b/c"],
      ["Copy / move", "cp -r SRC DEST  /  mv SRC DEST"],
      ["Delete", "rm FILE  /  rm -r DIR"],
      ["Hard link", "ln SRC NAME"],
      ["Soft link", "ln -s SRC NAME"],
      ["Wildcards", "*.txt  ?  [a-z]"],
      ["Brace expansion", "{a,b,c}   {1..5}"]
    ],
    inOneSentence: "One root tree; absolute and relative paths; touch/mkdir/cp/mv/rm; hard links are the same data while soft links are just a path; and quote anything with a space."
  },

  /* =============================================== Ch 4 — getting help */
  {
    id: "rh124-05",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 4,
    title: "Getting Help in RHEL",
    partTitle: "Chapter 4 — man pages, info pages and apropos",
    exam: "RHCSA (EX200) — 1.6 use documentation and help systems",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "Reading documentation",
        concepts: [
          {
            n: 1,
            title: "The man page",
            main: "Every real command has a manual page, and reading one properly answers almost any question.",
            simple: [
              "You do not need to memorise flags. You need to know how to look one up in ten seconds, which is what the man page teaches.",
              "In an exam or on the job, the man page is always available — using it is a skill, not cheating."
            ],
            example: ["man ls", "man 5 passwd", "apropos password"],
            parts: [
              ["man COMMAND", "show the manual page for a command."],
              ["man 5 passwd", "the fifth section is a file format, not a command."],
              ["/searchterm", "inside the page, type / then the word to jump to matches."],
              ["n / N", "jump to the next or previous match."],
              ["q", "quit back to your prompt."],
              ["man -k keyword", "search all man pages for a keyword (apropos)."]
            ],
            remember: "man COMMAND, then / to search inside it and q to quit."
          },
          {
            n: 2,
            title: "The man page sections",
            main: "The numbered sections each describe a different kind of thing, so you know which one to ask for.",
            simple: [
              "Commands and file formats both have man pages, so they are numbered to keep them apart. When you are not sure, try the likely section."
            ],
            parts: [
              ["1", "user commands you type."],
              ["5", "file formats — the structure of a config file."],
              ["8", "system administration commands."],
              ["man 5 fstab", "read the structure of /etc/fstab, not a command called fstab."]
            ],
            remember: "Section 1 is commands, 5 is file formats — use the number when a name could be either."
          },
          {
            n: 3,
            title: "GNU Info documentation",
            main: "info covers deeper material than man does, and is used mainly for GNU core tools.",
            simple: [
              "Man pages are short by design. When you want the full manual, info has it — mostly for tools that came from the GNU project.",
              "It uses a menu you navigate with arrows rather than scrolling."
            ],
            example: ["info bash", "info coreutils 'cp invocation'"],
            parts: [
              ["info COMMAND", "open the deeper manual."],
              ["arrows / space", "move through the menu."],
              ["q", "quit."]
            ],
            remember: "man for the quick answer, info when you need the full story."
          }
        ]
      }
    ],
    revision: [
      ["Open a manual page", "man ls"],
      ["Search inside the page", "/keyword"],
      ["Find a command by keyword", "man -k keyword  /  apropos keyword"],
      ["Read a file format", "man 5 fstab"],
      ["Deeper documentation", "info bash"]
    ],
    inOneSentence: "man COMMAND gives the quick answer, / searches inside it, man -k finds commands by keyword, and info holds the deeper manuals."
  },

  /* ================================ Ch 5 — text files, Vim and variables */
  {
    id: "rh124-06",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 5,
    title: "Creating, Viewing and Editing Text Files",
    partTitle: "Chapter 5 — streams, pipelines, Vim, and shell variables",
    exam: "RHCSA (EX200) — 2.4-2.6 streams, pipelines and text editing",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "Streams and pipelines",
        concepts: [
          {
            n: 1,
            title: "Standard input, output and error",
            main: "Every command has three channels: it reads from 0, writes results to 1, and writes errors to 2.",
            simple: [
              "Think of three labelled tubes. Most commands only use one, but all three are always there.",
              "This is why you can take a command's normal output and feed it somewhere else — the output is just a stream you can redirect."
            ],
            example: ["ls > out.txt", "ls 2> err.txt", "ls > out.txt 2>&1", "ls >> out.txt"],
            parts: [
              ["0 = stdin", "where a command reads its input."],
              ["1 = stdout", "normal results."],
              ["2 = stderr", "error messages."],
              ["> FILE", "write stdout to a file, replacing it."],
              ["2> FILE", "write stderr to a file instead."],
              ["> FILE 2>&1", "send both into the same file."],
              [">> FILE", "append rather than overwrite."]
            ],
            remember: "0 in, 1 results, 2 errors — and 2>&1 merges errors into the results."
          },
          {
            n: 2,
            title: "Pipelines and tee",
            main: "A pipe sends one command's output straight into the next command as its input.",
            simple: [
              "Like a conveyor belt: the output of the first machine becomes the input to the second. No temporary file needed.",
              "tee splits the stream — it sends it onward down the pipe and also writes a copy to a file."
            ],
            example: ["ls -l | less", "cat file | grep error | wc -l", "ls -l | tee listing.txt | less"],
            parts: [
              ["|", "pipe — feed one command's output into the next."],
              ["tee FILE", "write a copy to FILE while still passing it down the pipe."],
              ["grep / wc / sort", "common filters to chain."],
              ["< FILE", "redirect a file into a command's stdin instead of the keyboard."]
            ],
            remember: "Pipe with |; use tee when you want to save a copy and keep processing."
          },
          {
            n: 3,
            title: "Here documents",
            main: "A here document feeds several lines of text into a command as its input.",
            simple: [
              "Useful when a command needs multiple lines and you do not want to create a file first — writing a short config, for instance."
            ],
            example: ["cat > /etc/motd << EOF", "Welcome to the lab", "EOF"],
            parts: [
              ["<< EOF", "start feeding lines until you type EOF on its own line."],
              ["the closing word", "must match the opening word exactly."]
            ],
            remember: "<< EOF ... EOF feeds multi-line text to a command."
          }
        ]
      },
      {
        title: "Editing with Vim",
        concepts: [
          {
            n: 4,
            title: "Vim has modes, and that is the whole difficulty",
            main: "Vim behaves differently depending on its current mode.",
            simple: [
              "This is why new users get stuck: pressing a letter in the wrong mode does something unexpected instead of typing it.",
              "Learn the modes first and Vim stops being mysterious."
            ],
            example: ["vim /etc/hosts"],
            parts: [
              ["Normal mode", "the default — navigate and run commands. Press Esc to return here."],
              ["Insert mode", "actually typing text. Enter with i, a, o or I."],
              ["i", "insert before the cursor."],
              ["a", "insert after the cursor."],
              ["o", "open a new line below and start typing."],
              [":w", "write (save)."],
              [":q", "quit."],
              [":wq", "write and quit."],
              [":q!", "quit without saving, discarding changes."],
              ["dd", "delete a line (in Normal mode)."],
              ["yy", "copy a line."]
            ],
            remember: "Esc returns to Normal mode; i/a/o enter Insert mode; :wq saves and quits."
          },
          {
            n: 5,
            title: "Getting unstuck in Vim",
            main: "There is a small set of keys that rescue you from almost any Vim situation.",
            simple: [
              "Almost every 'Vim has frozen' problem is one of these: you are in Insert mode and cannot run a command, or you have unsaved changes and :q will not work."
            ],
            example: ["Esc :q! Enter", "Esc :wq Enter"],
            parts: [
              ["Esc", "back to Normal mode — always safe."],
              [":q!", "quit and throw away changes."],
              [":wq", "save and quit."],
              ["Ctrl+c", "if you are truly lost, this leaves Vim without saving."]
            ],
            remember: "Esc, then :q! to bail out safely — that gets you unstuck every time."
          }
        ]
      },
      {
        title: "Shell and environment variables",
        concepts: [
          {
            n: 6,
            title: "Shell variables versus environment variables",
            main: "A shell variable lives only in your current shell; an environment variable is passed to every command you run.",
            simple: [
              "A shell variable is a note on your desk. An environment variable is pinned to the door, so everyone who walks in can read it.",
              "Commands only see environment variables — that is why HOME and PATH work everywhere without you passing them."
            ],
            example: ["MYVAR=hello", "echo $MYVAR", "export MYVAR", "export PATH=$PATH:/opt/bin", "env | sort"],
            parts: [
              ["NAME=value", "assign, with no spaces around the =."],
              ["$NAME", "use the value."],
              ["echo $VAR", "check what it currently holds."],
              ["unset VAR", "remove it."],
              ["export VAR", "make it visible to every command you run."],
              ["env", "list all environment variables."],
              ["export -p", "show them with their export status."]
            ],
            remember: "A plain assignment is shell-only; export passes it to your commands."
          },
          {
            n: 7,
            title: "PATH and why it decides which command runs",
            main: "PATH is an ordered list of folders; the shell runs the first match it finds.",
            simple: [
              "Imagine the shell checking a list of drawers in order and using the first one holding the tool you asked for.",
              "If an older copy of a command sits in an earlier folder, that one runs — which is why a newly installed command sometimes seems to be ignored."
            ],
            example: ["echo $PATH", "which dnf", "type -a dnf"],
            parts: [
              ["PATH", "colon-separated list of folders, searched left to right."],
              ["which CMD", "show which one would run."],
              ["type -a CMD", "show every match found in PATH."],
              ["export PATH=$PATH:/opt/bin", "append a folder — $PATH first so you keep the existing ones."]
            ],
            remember: "PATH is searched left to right; the first match wins — which is the answer to 'I installed it but nothing changed'."
          },
        ]
      },
    ],
    revision: [
      ["Redirect stdout", "cmd > file"],
      ["Redirect stderr", "cmd 2> file"],
      ["Merge both", "cmd > file 2>&1"],
      ["Append", "cmd >> file"],
      ["Pipe", "cmd1 | cmd2"],
      ["Save a copy mid-pipe", "cmd | tee file | cmd2"],
      ["Here document", "cat > file << EOF ... EOF"],
      ["Vim: insert / save / quit", "i   :wq   :q!"],
      ["Environment variable", "export NAME=value"]
    ],
    inOneSentence: "Every command has three streams you can redirect; pipes chain them; Vim is mode-based and Esc always rescues you; and only exported variables reach your commands."
  },
];