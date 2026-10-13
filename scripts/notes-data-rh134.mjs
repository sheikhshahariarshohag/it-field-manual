/**
 * notes-data-rh134.mjs — RH134, one entry per chapter of the supplied
 * RHEL Administrator Part 2 document.
 *
 * Plain-English notes in the six-part shape the learner set as the template:
 *   Main idea -> Simple explanation -> Example -> What each part means -> Remember
 *
 * These sit BESIDE the full chapter text, never instead of it. The chapter view
 * links straight to the original; these give the understanding.
 *
 * ORGANISATION
 * These follow the supplied document's own chapter numbering — 1, then 3 to 13.
 * The document has no Chapter 2, and that gap is left visible rather than
 * renumbered away, because a missing chapter in the source should be obvious.
 *
 * REPLACES
 * The previous notes were organised as eight "Parts" that bundled unrelated
 * material (Part 3 held tuned, nice, ACLs and all of SELinux together). The
 * supplied document separates these into their own chapters, so the notes are
 * reorganised to match. Where a topic carries over, the explanation is the
 * same explanation — only its home chapter changed. Where the new document
 * teaches something the old extraction did not (exit codes, if/then/elif,
 * NFSv4, autofs direct versus indirect maps, Cockpit virtual machines), there
 * is new material here rather than recycled text.
 */

export const RH134_NOTES = [
  /* ================= Chapter 1 — command-line productivity + scheduling */
  {
    id: "rh134-01",
    book: "RH134",
    bookTitle: "RHEL Administrator Part 2",
    n: 1,
    title: "Improving Command-Line Productivity",
    partTitle: "Chapters 1 and 2 combined — scripts, loops, conditions, regular expressions and job scheduling",
    exam: "RHCSA (EX200) — scripting and job scheduling",
    source: "RH134 course material (RHEL Administrator Part 2)",
    status: "written",
    sections: [
      {
        title: "Writing and running scripts",
        concepts: [
          {
            n: 1,
            title: "What a shell script is",
            main: "A Bash script is a text file holding a list of commands that Linux runs in sequence.",
            simple: [
              "Imagine a checklist for your morning server check. Instead of retyping the same commands every day, you write them once and run the file.",
              "The shell reads the file line by line and runs each line exactly as if you had typed it."
            ],
            example: ["#!/bin/bash", "# check the disks", "lsblk", "df -h"],
            parts: [
              ["#!/bin/bash", "the shebang — tells the kernel which interpreter reads the file."],
              ["lsblk / df -h", "ordinary commands, run in order."],
              ["#", "a comment — the shell ignores it."]
            ],
            remember: "A script is a saved list of commands, run in order, exactly the same way every time."
          },
          {
            n: 2,
            title: "Specifying the interpreter",
            main: "Without a shebang, the shell falls back to /bin/sh, which is more limited than Bash.",
            simple: [
              "Bash has features that plain sh does not — arrays, [[ ]], process substitution. If your script starts failing on syntax you are sure is correct, the interpreter is the first thing to check.",
              "The shebang removes the guesswork by naming the interpreter explicitly."
            ],
            parts: [
              ["#!/bin/bash", "run with Bash — what you almost always want."],
              ["#!/bin/sh", "run with plain sh — portable but limited."],
              ["no shebang", "the shell defaults to sh when you run it, which can behave differently."]
            ],
            remember: "Always start a Bash script with #!/bin/bash — without it you silently get sh."
          },
          {
            n: 3,
            title: "Executing a script",
            main: "A new file must be made executable before you can run it by name.",
            simple: [
              "The file is just text until you give it permission to be a program. That permission is the execute bit."
            ],
            example: ["chmod +x check.sh", "./check.sh", "bash check.sh"],
            parts: [
              ["chmod +x", "add execute permission."],
              ["./check.sh", "run the file in this folder. The ./ means 'here'."],
              ["bash check.sh", "run it with Bash explicitly — no execute bit needed, though arguments still pass correctly."]
            ],
            remember: "chmod +x, then ./name — or bash name if you do not want to change permissions."
          },
          {
            n: 4,
            title: "Quoting special characters",
            main: "Without quotes the shell interprets spaces, asterisks and dollar signs itself before the command ever sees them.",
            simple: [
              "When you type rm $file the shell expands $file first, and rm receives whatever it became. That is convenient until the value contains a space, and then rm receives two arguments instead of one.",
              "Quotes hand the text to the command exactly as you typed it."
            ],
            example: ["rm \"$file\"", "echo 'no $expansion here'"],
            parts: [
              ["\"double quotes\"", "keep it as one argument, but still expand $ and *."],
              ["'single quotes'", "everything literal — no expansion at all."],
              ["unquoted", "the shell splits on spaces and expands wildcards."]
            ],
            remember: "Quote anything containing a space or a wildcard — and quote variables.",
            warning: "rm $file unquoted becomes rm $file1 $file2 if the variable holds two names, and removes the wrong things."
          },
          {
            n: 5,
            title: "Providing output",
            main: "echo prints values, and quoting it stops the shell from mangling them.",
            simple: [
              "echo \"Total: $count files\" prints a readable line. But echo is not perfectly safe with backslashes and some special values — printf '%s\\n' is the stricter alternative.",
              "The practical rule: quote what you echo, and use printf when the text matters."
            ],
            example: ["echo \"Disks: $count\"", "printf '%s\\n' \"$value\""],
            parts: [
              ["echo", "print a line — convenient, but interprets some escape sequences."],
              ["printf '%s\\n'", "print exactly, with no interpretation — safer for values."]
            ],
            remember: "Quote your echo arguments; use printf when the exact text matters."
          }
        ]
      },
      {
        title: "Loops",
        concepts: [
          {
            n: 6,
            title: "Why loops exist",
            main: "A loop runs the same block of commands once for every item in a list.",
            simple: [
              "Administration is full of repetition: check ten servers, process every file in a folder, restart three services.",
              "Write the command once and let the loop do the repeating."
            ],
            example: ["for HOST in host1 host2 host3; do", "  ping -c1 $HOST", "done"],
            parts: [
              ["for X in LIST", "take each item from LIST, one at a time."],
              ["do / done", "the start and end of the repeated block."],
              ["$HOST", "the current item."]
            ],
            remember: "for X in LIST; do ... done runs the block once per item."
          },
          {
            n: 7,
            title: "Providing lists to a loop",
            main: "The list can be typed, generated from a range, matched from filenames, or produced by another command.",
            simple: [
              "Knowing which source to reach for is the actual skill. A brace range builds numbers, a glob matches filenames, and command substitution takes the output of another command."
            ],
            example: [
              "for H in host1 host2; do ... done       # typed",
              "for H in host{1..3}; do ... done       # brace range",
              "for F in /var/log/*.log; do ... done  # glob",
              "for U in $(cut -d: -f1 /etc/passwd); do ... done  # command substitution"
            ],
            parts: [
              ["{1..5}", "brace expansion — builds a range of numbers."],
              ["*.log", "glob — matches files by name pattern."],
              ["$(command)", "command substitution — the output becomes the list."]
            ],
            remember: "Braces build numbers, globs build filenames, $() builds from a command's output."
          },
          {
            n: 8,
            title: "Checking several servers",
            main: "The common real-world loop: run the same check across a list of hosts over SSH.",
            simple: [
              "You almost never inspect ten machines one at a time. The loop does the repetition and the command does the check.",
              "The single quotes around the remote command matter — they stop the local shell from expanding the remote variables before they are sent."
            ],
            example: ["for HOST in servera serverb; do", "  ssh $HOST 'uptime'", "done"],
            parts: [
              ["ssh $HOST", "connect to each machine in turn."],
              ["'uptime'", "single quotes so the remote shell, not the local one, interprets it."]
            ],
            remember: "A loop over hosts plus SSH is how you check many machines without typing each one."
          }
        ]
      },
      {
        title: "Exit codes and conditions",
        concepts: [
          {
            n: 9,
            title: "Understanding exit codes",
            main: "Every command reports success or failure as a number: 0 means success, anything else means failure.",
            simple: [
              "This is how a script knows whether the previous step worked. It is not an error message — it is a status, and scripts are built on it.",
              "The special variable $? holds the exit code of the command you just ran."
            ],
            example: ["ls /nonexistent; echo $?", "ping -c1 servera; echo $?"],
            parts: [
              ["0", "success."],
              ["1", "a general failure."],
              ["127", "the command was not found — a very common one."],
              ["$?", "the exit code of the previous command."]
            ],
            remember: "0 is success; $? holds the last exit code and is how scripts decide what to do next."
          },
          {
            n: 10,
            title: "Testing with operators",
            main: "The && and || operators run a second command only if the first succeeded or failed.",
            simple: [
              "Instead of writing an if statement for a simple chain, you can join commands directly.",
              "This reads like a sentence: 'do this, and only if that worked, do this'."
            ],
            example: ["mkdir -p /srv/app && chown app:app /srv/app", "ping -c1 servera || echo \"unreachable\""],
            parts: [
              ["A && B", "run B only if A succeeded."],
              ["A || B", "run B only if A failed."],
              ["readability", "chains get unreadable past two — use an if statement beyond that."]
            ],
            remember: "&& runs on success, || runs on failure — useful for short chains, not for long logic."
          },
          {
            n: 11,
            title: "if / then and if / then / else",
            main: "An if statement runs a block only when a condition is true, and else covers the other case.",
            simple: [
              "When a chain of && becomes hard to read, this is the readable form. It is the core of every decision in a script."
            ],
            example: ["if [ -d /srv/data ]; then", "  echo \"exists\"", "else", "  echo \"missing\"", "fi"],
            parts: [
              ["if [ TEST ]; then", "start a single test."],
              ["else", "what to do when it is false."],
              ["fi", "closes the if — easy to forget."],
              ["[ -d PATH ]", "true if the path is a directory. -f file, -e exists."]
            ],
            remember: "if [ test ]; then ... fi — and fi closes it."
          },
          {
            n: 12,
            title: "if / elif / else",
            main: "elif chains multiple tests and stops at the first one that matches.",
            simple: [
              "Like a series of questions asked in order. The first true condition wins, and everything after it is skipped.",
              "Using elif rather than a chain of separate if statements means only one branch can ever run."
            ],
            example: ["if [ \"$COUNT\" -gt 100 ]; then", "  echo high", "elif [ \"$COUNT\" -gt 10 ]; then", "  echo medium", "else", "  echo low", "fi"],
            parts: [
              ["if / elif / else", "first matching branch runs only."],
              ["-gt / -lt / -eq", "greater than / less than / equal to — numbers need -eq, not =."],
              ["separate if statements", "all matching branches would run — usually not what you meant."]
            ],
            remember: "elif stops at the first true condition; separate if statements would all run."
          }
        ]
      },
      {
        title: "Regular expressions",
        concepts: [
          {
            n: 13,
            title: "What a regular expression is",
            main: "A regular expression describes a pattern of text rather than one exact word.",
            simple: [
              "A normal search looks for a literal string. A regex describes a shape — 'any digit', 'the word error at the start of a line', 'five to ten characters'.",
              "This is what turns reading a huge log file by eye into a single command."
            ],
            example: ["grep -E 'ERROR|WARN' /var/log/messages"],
            parts: [
              ["grep", "search text using a pattern."],
              ["-E", "extended regular expressions."],
              ["|", "or — either alternative matches."],
              ["'...'", "quotes stop the shell from interpreting the pattern."]
            ],
            remember: "A regex describes a pattern, not a literal word."
          },
          {
            n: 14,
            title: "Anchors, character classes and repetition",
            main: "^ and $ pin to line boundaries, [ ] match one of a set, and + * ? control repetition.",
            simple: [
              "These four tools cover most real log searching on their own."
            ],
            example: ["grep -E '^Failed' /var/log/secure", "grep -E '[0-9]{1,3}\\.[0-9]{1,3}' app.log", "grep -E 'colou?r' app.log"],
            parts: [
              ["^ and $", "start and end of a line."],
              ["[0-9a-f]", "any single character from the set."],
              ["+  *  ?", "one or more / zero or more / optional."],
              ["{m,n}", "between m and n repetitions."],
              ["\\.", "an escaped dot — a literal dot, not any character."]
            ],
            remember: "^ $ anchor, [ ] is a set, + * ? repeat — and escape a literal dot."
          },
          {
            n: 15,
            title: "Useful grep options",
            main: "A few options turn grep from a toy into the tool you will use every day.",
            simple: [
              "Counting matches, ignoring case and searching in context are what you actually need when investigating."
            ],
            example: ["grep -c 'error' app.log", "grep -i 'timeout' app.log", "grep -B2 -A2 'Error' app.log", "grep -v 'debug' app.log", "grep -r 'PermitRootLogin' /etc/ssh"],
            parts: [
              ["-c", "count matching lines."],
              ["-i", "ignore case."],
              ["-v", "invert — show lines that do NOT match."],
              ["-B / -A", "lines of context before / after the match."],
              ["-r", "search directories recursively."],
              ["-n", "show line numbers."]
            ],
            remember: "-c counts, -i ignores case, -v inverts, -B/-A give context, -r recurses."
          }
        ]
      },
      {
        title: "Scheduling future work",
        concepts: [
          {
            n: 16,
            title: "One-time jobs with at",
            main: "at schedules a command to run once at a future time; atd is the service that runs it.",
            simple: [
              "Setting an alarm for something later. You type the command, press Ctrl+D to submit, and the job waits.",
              "Use at for a single job at a specific time — not for anything repeating."
            ],
            example: ["at now +5min", "", "touch /tmp/testfile", "", "# then press Ctrl+D"],
            parts: [
              ["at now +5min", "run it in five minutes."],
              ["at noon +4 days", "noon, four days from now."],
              ["atq / at -l", "list pending jobs."],
              ["at -c 28", "show the saved detail of job 28."],
              ["Ctrl+D", "submit the job."]
            ],
            remember: "at is for one-time jobs; atq lists them and Ctrl+D submits."
          },
          {
            n: 17,
            title: "Recurring jobs with cron",
            main: "crond runs jobs repeatedly on a schedule, and crontab manages your own list.",
            simple: [
              "An alarm that rings every morning instead of once. cron is the service, cronie is the package, crontab is the command you use.",
              "Enter one job per line and save."
            ],
            example: ["crontab -l", "crontab -e", "crontab -r"],
            parts: [
              ["crontab -l", "list your jobs."],
              ["crontab -e", "edit them."],
              ["crontab -r", "delete ALL of them."],
              ["crond", "the background service that runs the jobs."]
            ],
            remember: "Use crontab for your own recurring jobs; check with -l before -r.",
            warning: "crontab -r removes every job for the current user with no confirmation and no undo."
          },
          {
            n: 18,
            title: "The five time fields",
            main: "The first five fields say when to run; everything after is the command.",
            simple: [
              "They always mean the same five things in the same order. Read left to right before deciding when a job fires."
            ],
            example: ["0 9 * * 1-5 /usr/local/bin/daily_report"],
            parts: [
              ["0", "minute."],
              ["9", "hour."],
              ["*", "day of month."],
              ["*", "month."],
              ["1-5", "weekday — Monday to Friday."],
              ["/usr/local/bin/daily_report", "the command."]
            ],
            remember: "minute, hour, day of month, month, day of week — then the command."
          },
          {
            n: 19,
            title: "Cron symbols",
            main: "Symbols describe repeating times without a separate job for every one.",
            simple: [
              "* is any value, - is a range, , selects specific values and */n is an interval.",
              "Weekdays run 0 or 7 for Sunday through 6 for Saturday, and names like Mon and Jan also work."
            ],
            example: ["*/5 * * * * command", "0 8 1,15 * * command"],
            parts: [
              ["*", "every value."],
              ["9-16", "a range, including both ends."],
              ["1,15", "selected values."],
              ["*/5", "every five units."],
              ["Mon / Jan", "short names also work."]
            ],
            remember: "* any, - range, , selected, */n interval."
          },
          {
            n: 20,
            title: "The day-field OR rule",
            main: "When BOTH day fields are restricted, cron runs the job when EITHER matches — not when both do.",
            simple: [
              "This surprises nearly everyone. It is an OR, not an AND.",
              "If you need both to be true, run twice, or use a script that checks the date itself."
            ],
            example: ["15 12 15 * Fri command"],
            parts: [
              ["15 12 15 * Fri", "12:15 PM on the 15th of the month OR on any Friday."],
              ["not", "it does not require both conditions at once."]
            ],
            remember: "When both day fields are restricted, cron uses OR logic between them."
          },
          {
            n: 21,
            title: "System-wide cron and Anacron",
            main: "System entries add a username field, and Anacron lets periodic jobs catch up after downtime.",
            simple: [
              "A personal crontab is yours. A system-wide entry has six fields — the extra one is which account runs the command.",
              "Anacron is for jobs that must happen roughly daily whether or not the machine was awake at the time."
            ],
            example: ["# /etc/cron.d/mybackup", "0 2 * * * root /usr/local/bin/backup", "", "cat /etc/anacrontab"],
            parts: [
              ["the extra root field", "only present in system-wide files."],
              ["/etc/cron.d/", "put your own system jobs here rather than editing /etc/crontab."],
              ["/etc/cron.hourly|daily|weekly|monthly/", "directories of executable scripts run at those intervals."],
              ["/etc/anacrontab", "catch-up jobs — they run late rather than not at all."]
            ],
            remember: "System cron entries have six parts: five time fields, a username, and a command."
          },
          {
            n: 22,
            title: "systemd timers and temporary files",
            main: "A timer decides when to activate a unit, and systemd-tmpfiles manages temporary files by written rules.",
            simple: [
              "The timer is the alarm clock; the service is the worker it wakes. They are separate units.",
              "Temporary files need a written policy for what to keep and what to remove — systemd-tmpfiles applies it."
            ],
            example: ["[Timer]", "OnCalendar=*:00/10", "", "systemctl daemon-reload", "systemctl enable --now mytask.timer", "", "systemd-tmpfiles --clean"],
            parts: [
              ["OnCalendar", "activate on a calendar schedule."],
              ["OnUnitActiveSec", "activate an interval after the last activation."],
              ["daemon-reload", "tell systemd to reread unit files after editing."],
              ["enable --now", "start at boot AND start now."],
              ["--create --remove", "apply the creation and removal rules at boot."],
              ["--clean", "remove files past their configured age, now."]
            ],
            remember: "The timer decides when, the service decides what; put custom units under /etc and reload systemd."
          }
        ]
      }
    ],
    revision: [
      ["Run a script", "./script.sh  /  bash script.sh"],
      ["Test a command", "[ -f FILE ]   and   echo $?"],
      ["Chain on success / failure", "cmd1 && cmd2   /   cmd1 || cmd2"],
      ["Conditional", "if ... then / elif ... else / fi"],
      ["Search with a pattern", "grep -E 'pattern' file"],
      ["One-time job", "at   /   atq"],
      ["Recurring jobs", "crontab -l  /  -e  /  -r"],
      ["Five time fields", "minute hour day month weekday"],
      ["System jobs", "/etc/cron.d/  (six fields)"],
      ["Catch-up jobs", "/etc/anacrontab"],
      ["Timers", "systemctl enable --now NAME.timer"],
      ["Temporary files", "systemd-tmpfiles --clean"]
    ],
    inOneSentence: "Scripts save steps so they repeat identically, loops run them over a list, exit codes and if/then decide what happens next, regex finds the exact line, and at or cron puts it on a schedule."
  },

  /* ============================== Chapter 3 — tuning system performance */
  {
    id: "rh134-03",
    book: "RH134",
    bookTitle: "RHEL Administrator Part 2",
    n: 3,
    title: "Tuning System Performance",
    partTitle: "Chapter 3 — tuned profiles and process scheduling priority",
    exam: "RHCSA (EX200) — tuning and process scheduling",
    source: "RH134 course material (RHEL Administrator Part 2)",
    status: "written",
    sections: [
      {
        title: "tuning profiles",
        concepts: [
          {
            n: 1,
            title: "What tuned does",
            main: "tuned applies a whole named bundle of system settings at once, instead of you hand-tuning individual values.",
            simple: [
              "Like choosing a preset on an equalizer rather than moving every slider yourself. Each profile knows which disk scheduler, CPU governor and network settings work well together."
            ],
            example: ["tuned-adm list", "tuned-adm active", "tuned-adm profile throughput-performance"],
            parts: [
              ["tuned-adm list", "show every available profile."],
              ["tuned-adm active", "show the one currently applied."],
              ["tuned-adm profile NAME", "switch to it."],
              ["systemctl start tuned", "the daemon that applies the profile."]
            ],
            remember: "tuned applies a whole named bundle of settings at once."
          },
          {
            n: 2,
            title: "Static versus dynamic",
            main: "A static profile applies settings once; a dynamic profile keeps watching and adjusts as conditions change.",
            simple: [
              "Static is setting the thermostat once. Dynamic is a thermostat that keeps reacting as the room changes.",
              "Dynamic tuning can push hard for a busy task and relax once the system goes idle."
            ],
            parts: [
              ["static", "settings applied once, when the profile is selected."],
              ["dynamic", "tuned monitors activity and adjusts on the fly."]
            ],
            remember: "static applies once; dynamic keeps adjusting as load changes."
          }
        ]
      },
      {
        title: "Process scheduling priority",
        concepts: [
          {
            n: 3,
            title: "What a nice value does",
            main: "The nice value decides who gets CPU time first when processes compete.",
            simple: [
              "When there is plenty of CPU, priority barely matters. When CPU is contended, priority decides who is served first.",
              "A lower number means higher priority. A nice process is polite — it gives way to others."
            ],
            example: ["nice -n 10 sleep 300 &", "renice -n 5 -p 12345"],
            parts: [
              ["-20", "highest priority."],
              ["0", "the default for normal processes."],
              ["19", "lowest priority — most willing to yield."],
              ["nice -n N cmd", "start a command at a chosen niceness."],
              ["renice -n N -p PID", "change a process already running."]
            ],
            remember: "Lower number = higher priority; higher number = more polite."
          },
          {
            n: 4,
            title: "The privilege rule",
            main: "Only root can make a process more important; a normal user can only make their own less important.",
            simple: [
              "You can always volunteer to give your own work away. You cannot take priority that belongs to someone else.",
              "That is why nice -n -5 fails for a normal user but works for root."
            ],
            parts: [
              ["nice -n -5 ...", "raise priority — needs root."],
              ["nice -n 5 ...", "lower priority — any user may do this to their own process."]
            ],
            remember: "Lowering a nice number needs root; raising it is always allowed."
          }
        ]
      }
    ],
    revision: [
      ["List / show / switch profile", "tuned-adm list / active / profile NAME"],
      ["Start with a niceness", "nice -n 10 command"],
      ["Change a running process", "renice -n 5 -p PID"],
      ["The scale", "-20 highest, 0 default, 19 lowest"]
    ],
    inOneSentence: "tuned applies named bundles of settings; a nice value decides who waits for the CPU, and only root may make a process more important."
  },

  /* ================================= Chapter 4 — access control lists */
  {
    id: "rh134-04",
    book: "RH134",
    bookTitle: "RHEL Administrator Part 2",
    n: 4,
    title: "Controlling Access to Files with ACLs",
    partTitle: "Chapter 4 — POSIX ACLs, default ACLs and administration",
    exam: "RHCSA (EX200) — controlling access with ACLs",
    source: "RH134 course material (RHEL Administrator Part 2)",
    status: "written",
    sections: [
      {
        title: "Why ACLs exist",
        concepts: [
          {
            n: 1,
            title: "The limit of normal permissions",
            main: "Normal permissions give you three groups — owner, group, everyone else — so they cannot say that one extra person also gets write.",
            simple: [
              "Standard permissions are a door with three keys: the owner, the team, and anyone.",
              "If you need one specific outsider to also have access, those three keys cannot express it. ACLs add named users and groups on top."
            ],
            example: ["getfacl reports.txt"],
            parts: [
              ["user::rwx", "the owner's permissions."],
              ["group::r--", "the owning group's."],
              ["user:consultant3:---", "a named extra user — here, no access."],
              ["mask::rwx", "the ceiling for all named entries and the group."],
              ["other::---", "everyone else."]
            ],
            remember: "ACLs add named users and named groups on top of owner, group and other."
          },
          {
            n: 2,
            title: "Setting and removing ACLs",
            main: "setfacl adds, changes and removes the extra named entries on a file.",
            simple: [
              "You are adding a key to the door, or taking one away. -m modifies, -x removes.",
              "Capital X is deliberate: it gives execute only where it makes sense — directories, or files already executable."
            ],
            example: ["setfacl -m u:consultant3:rw reports.txt", "setfacl -m g:consultants:rX reports.txt", "setfacl -m u::rwx,g:consultants:rX,o::- file", "setfacl -x u:consultant3 reports.txt", "setfacl -b reports.txt"],
            parts: [
              ["-m", "add or modify an entry."],
              ["-x", "remove one named entry."],
              ["-b", "remove every extended entry."],
              ["u:name:perms", "a named user — blank name means the owner."],
              ["g:name:perms", "a named group."],
              ["X", "capital X — execute only if a directory or already executable."]
            ],
            remember: "setfacl -m adds or changes, -x removes one, -b clears all extended entries."
          },
          {
            n: 3,
            title: "The mask and why entries stop working",
            main: "The mask is a ceiling on all named entries and the owning group, and it can silently reduce them.",
            simple: [
              "Set the owning group's permissions and you will often see the mask shrink with them, quietly removing access from named users.",
              "The mask is not a permission anyone uses directly; it is a limit the system applies."
            ],
            example: ["setfacl -m m::rwx reports.txt", "getfacl reports.txt"],
            parts: [
              ["mask::rwx", "the maximum any named entry or the group can have."],
              ["#effective:", "the rights a named entry actually has after the mask applies."],
              ["setfacl -m m::rwx", "lift the ceiling."]
            ],
            remember: "The mask caps named entries — a #effective:rw comment means the mask reduced them."
          },
          {
            n: 4,
            title: "Default ACLs on directories",
            main: "A default ACL on a directory is inherited by everything created inside it.",
            simple: [
              "This is how you give a whole project directory the right access once, rather than setting every new file individually."
            ],
            example: ["mkdir -p project", "setfacl -m d:u:consultant3:rwx project", "touch project/newfile", "getfacl project/newfile"],
            parts: [
              ["d:u:name:perms", "a default entry — inherited, not applied to the directory itself."],
              ["inherited on create", "new files pick it up automatically."],
              ["default:user::", "shows separately in getfacl output."]
            ],
            remember: "A default ACL on a directory is inherited by everything created inside it."
          },
          {
            n: 5,
            title: "Copying and moving files with ACLs",
            main: "cp preserves an ACL only with -a or -p; mv keeps the file and therefore keeps its ACL.",
            simple: [
              "A plain cp drops extended entries unless you ask, and the file then looks like it lost permissions."
            ],
            example: ["cp -a source dest", "cp -p source dest"],
            parts: [
              ["cp", "does NOT preserve an extended ACL."],
              ["cp -a", "archive mode — preserves the ACL."],
              ["cp -p", "preserve mode, ownership and timestamps."],
              ["mv", "keeps the same file, so the ACL travels with it."]
            ],
            remember: "cp drops ACLs unless you use -a or -p; mv keeps them."
          }
        ]
      }
    ],
    revision: [
      ["View an ACL", "getfacl FILE"],
      ["Add / remove an entry", "setfacl -m ...  /  setfacl -x ..."],
      ["Clear extended entries", "setfacl -b FILE"],
      ["Set the mask", "setfacl -m m::rwx FILE"],
      ["Default ACL for a directory", "setfacl -m d:u:name:rwx DIR"],
      ["Preserve on copy", "cp -a  /  cp -p"]
    ],
    inOneSentence: "ACLs add named users and groups on top of owner, group and other; the mask caps them; and a default ACL on a directory is inherited by everything inside it."
  },

  /* ==================================== Chapter 5 — managing SELinux */
  {
    id: "rh134-05",
    book: "RH134",
    bookTitle: "RHEL Administrator Part 2",
    n: 5,
    title: "Managing SELinux Security",
    partTitle: "Chapter 5 — modes, file contexts, Booleans and troubleshooting denials",
    exam: "RHCSA (EX200) — SELinux administration",
    source: "RH134 course material (RHEL Administrator Part 2)",
    status: "written",
    sections: [
      {
        title: "What SELinux is, and its modes",
        concepts: [
          {
            n: 1,
            title: "Why normal permissions are not enough",
            main: "Standard permissions and ACLs are Discretionary — the owner decides. SELinux is Mandatory — the policy decides, even over root.",
            simple: [
              "Under normal permissions, whoever owns a file hands out access, and any process running as that owner inherits it.",
              "SELinux flips this. A process asks whether the policy allows its type to act on that type. Even root can be refused."
            ],
            parts: [
              ["DAC", "Discretionary Access Control — the owner decides."],
              ["MAC", "Mandatory Access Control — the policy decides, regardless of ownership."]
            ],
            remember: "Owner decides is DAC; system policy decides is MAC, which is SELinux."
          },
          {
            n: 2,
            title: "The three modes",
            main: "Enforcing blocks and logs, Permissive only logs, and Disabled turns SELinux off entirely.",
            simple: [
              "Enforcing is a locked door. Permissive is the same door with the lock off — you get through, but it still records what it would have refused."
            ],
            example: ["getenforce", "setenforce 0", "setenforce 1", "sestatus"],
            parts: [
              ["Enforcing", "deny the action and log it."],
              ["Permissive", "allow it, but still log the denial."],
              ["Disabled", "off — only changeable in the boot configuration."],
              ["getenforce", "show the current mode."],
              ["setenforce 0/1", "switch between permissive and enforcing at runtime."],
              ["/etc/selinux/config", "SELINUX=enforcing|permissive|disabled — the mode at boot."]
            ],
            remember: "getenforce shows the mode; setenforce switches it at runtime; /etc/selinux/config sets it at boot."
          }
        ]
      },
      {
        title: "File contexts",
        concepts: [
          {
            n: 3,
            title: "The SELinux context",
            main: "Every file, directory and process carries a context of user:role:type:level, and the type decides file access.",
            simple: [
              "Think of the label as a sticker on the file saying what it is. The policy compares your process's type with the file's type."
            ],
            example: ["ls -Z /var/www/html", "ps -eZ | head"],
            parts: [
              ["ls -Z", "show a file's context."],
              ["ps -eZ", "show every process's context."],
              ["the type field", "almost always what matters for file access decisions."]
            ],
            remember: "ls -Z shows the context; the type field is what SELinux actually compares."
          },
          {
            n: 4,
            title: "How files get their context, and the mv trap",
            main: "New files inherit their context from the parent directory, but moving a file keeps its original context.",
            simple: [
              "Moving a file carries the old sticker with it, even into a folder that needs a different one. This is the number one cause of it worked yesterday."
            ],
            example: ["mv file /new/location", "cp file /new/location", "restorecon -Rv /var/www/html"],
            parts: [
              ["mv", "KEEPS the original context — the common problem."],
              ["cp", "takes the new location's default context."],
              ["restorecon -Rv PATH", "reset a path's contexts back to the policy default."],
              ["chcon", "change a context directly — not persistent across relabel."]
            ],
            remember: "mv keeps the old label, cp takes the new one — and restorecon fixes a wrong label properly.",
            warning: "A file that works in one directory and is denied in another usually just has the wrong label. Check ls -Z before changing anything else."
          },
          {
            n: 5,
            title: "Setting a context permanently with semanage",
            main: "chcon changes a label but is lost on relabel; semanage records a persistent rule instead.",
            simple: [
              "Think of chcon as changing the sticker by hand, and semanage as telling the system that files in this folder should always carry this label.",
              "Because the rule is stored, it survives a relabel and applies to files you have not created yet."
            ],
            example: ["semanage fcontext -l", "semanage fcontext -a -t httpd_sys_content_t '/srv/www(/.*)?'", "restorecon -Rv /srv/www"],
            parts: [
              ["semanage fcontext -l", "list the persistent label rules."],
              ["-a -t TYPE PATH_REGEX", "add a rule. The (/.*)? covers the directory and everything under it."],
              ["-m", "modify a rule."],
              ["-d", "delete a rule."],
              ["restorecon", "apply the stored rules to files on disk now."]
            ],
            remember: "chcon is temporary; semanage fcontext is the persistent fix, followed by restorecon."
          }
        ]
      },
      {
        title: "Booleans",
        concepts: [
          {
            n: 6,
            title: "What a Boolean is",
            main: "A Boolean is a pre-built on/off switch for a known policy variation, and is far safer than custom policy.",
            simple: [
              "Should Apache serve files out of users' home directories? That is one switch — httpd_enable_homedirs — instead of hand-building a rule."
            ],
            example: ["getsebool -a", "getsebool httpd_enable_homedirs", "setsebool httpd_enable_homedirs on", "setsebool -P httpd_enable_homedirs on"],
            parts: [
              ["getsebool -a", "list every Boolean and its state."],
              ["setsebool NAME on", "change it for THIS boot only."],
              ["setsebool -P NAME on", "change it and make it persistent."],
              ["semanage boolean -l", "list with descriptions."]
            ],
            remember: "setsebool changes for this boot; setsebool -P also makes it permanent."
          }
        ]
      },
      {
        title: "Troubleshooting denials",
        concepts: [
          {
            n: 7,
            title: "A safe troubleshooting order",
            main: "Start by asking whether SELinux is actually wrong, then check the file context, then a Boolean, and only then write policy.",
            simple: [
              "A web server reading /home might be exactly the attack SELinux exists to stop. Do not reflexively fix every denial."
            ],
            parts: [
              ["1", "ask whether SELinux is actually wrong here."],
              ["2", "check the file context with ls -Z — fix with restorecon (least risky)."],
              ["3", "check whether a documented Boolean covers it."],
              ["4", "only as a last resort, add a custom rule with audit2allow."]
            ],
            remember: "Fix the label before the Boolean, and the Boolean before writing policy."
          },
          {
            n: 8,
            title: "Reading a denial",
            main: "A denial names the source context (the process) and the target context (the file).",
            simple: [
              "Read it as a sentence: a process of this type tried to do this to something of that type, and policy says no."
            ],
            example: ["sealert -a /var/log/audit/audit.log", "cat /var/log/audit/audit.log | grep AVC"],
            parts: [
              ["source context", "who was trying — the process, for example httpd_t."],
              ["target context", "what it wanted — the file, for example default_t."],
              ["sealert", "inspect a denial in detail on a desktop system."],
              ["/var/log/audit/audit.log", "where denials are recorded."]
            ],
            remember: "Read a denial as process type did this to file type — both halves matter."
          },
          {
            n: 9,
            title: "ausearch and generating a policy",
            main: "ausearch finds the denial in the audit log, and audit2allow can turn denials into a custom policy module.",
            simple: [
              "ausearch -m avc -ts recent is the command you reach for when you suspect SELinux is blocking something.",
              "audit2allow is a last resort, because a rule generated from a denial you did not understand can lock you out."
            ],
            example: ["ausearch -m avc -ts recent", "ausearch -m avc -ts recent | audit2allow -M mylocal", "semodule -i mylocal.pp"],
            parts: [
              ["ausearch -m avc", "search the audit log for SELinux denials."],
              ["-ts recent", "since a recent timestamp."],
              ["audit2allow -M name", "generate a policy module from the denials found."],
              ["semodule -i", "install the generated module."]
            ],
            remember: "ausearch finds the denial; audit2allow is a last resort, not a first answer."
          }
        ]
      }
    ],
    revision: [
      ["Mode", "getenforce  /  setenforce 0|1"],
      ["Persistent mode", "/etc/selinux/config  (SELINUX=)"],
      ["Show context", "ls -Z FILE   /   ps -eZ"],
      ["Fix a context", "restorecon -Rv PATH"],
      ["Temporary label", "chcon (lost on relabel)"],
      ["Persistent rule", "semanage fcontext -a -t TYPE '/path(/.*)?'"],
      ["Booleans", "getsebool -a   /   setsebool -P NAME on"],
      ["Find denials", "ausearch -m avc -ts recent"]
    ],
    inOneSentence: "SELinux is a system policy that can refuse even root; check the file context first, then a Boolean, and only write policy as a last resort."
  },

  /* ================================ Chapter 6 — managing basic storage */
  {
    id: "rh134-06",
    book: "RH134",
    bookTitle: "RHEL Administrator Part 2",
    n: 6,
    title: "Managing Basic Storage",
    partTitle: "Chapter 6 — partitioning, file systems, mounts, swap and fstab",
    exam: "RHCSA (EX200) — basic storage administration",
    source: "RH134 course material (RHEL Administrator Part 2)",
    status: "written",
    sections: [
      {
        title: "Disks, partitions and file systems",
        concepts: [
          {
            n: 1,
            title: "Finding and inspecting disks",
            main: "lsblk shows block devices as a tree with sizes and mount points; lsblk -f adds the file system type and UUID.",
            simple: [
              "lsblk draws the storage as a tree, which is how you see that /dev/sda2 sits on /dev/sda."
            ],
            example: ["lsblk", "lsblk -f", "blkid", "fdisk -l /dev/sdb"],
            parts: [
              ["/dev/sd*, /dev/vd*, /dev/nvme*", "disk names depend on the bus type."],
              ["/dev/sda1", "a partition on the first disk."],
              ["lsblk -f", "also show file system type and UUID."],
              ["blkid", "read the UUID without mounting."],
              ["fdisk -l", "a traditional listing with sizes."]
            ],
            remember: "lsblk shows the tree; lsblk -f adds the file system type and UUID."
          },
          {
            n: 2,
            title: "Creating a partition with parted",
            main: "parted works interactively or from the command line, and can write a GPT or MBR table.",
            simple: [
              "You are cutting a disk into rooms. Separate partitions mean filling up your data does not fill up the system."
            ],
            example: ["parted /dev/sdb mklabel gpt", "parted /dev/sdb mkpart primary 1MiB 2GiB", "partprobe /dev/sdb"],
            parts: [
              ["mklabel gpt", "write a GPT partition table — do this first."],
              ["mkpart primary", "create a partition."],
              ["1MiB 2GiB", "start and end points. Starting at 1MiB rather than 0 avoids alignment problems."],
              ["partprobe", "tell the kernel to re-read the partition table."],
              ["print free", "show the layout and the unallocated space."]
            ],
            remember: "mklabel first, then mkpart, then partprobe — and start the first partition at 1MiB.",
            warning: "partprobe may warn the kernel is still using the table; that is normal and the new partition still appears in lsblk."
          },
          {
            n: 3,
            title: "Creating a file system",
            main: "A new partition is empty until you put a file system on it.",
            simple: [
              "Formatting builds the structure inside the partition. Until that happens it is just empty space.",
              "XFS is RHEL's default and the right choice for most new work."
            ],
            example: ["mkfs.xfs /dev/sdb1", "mkfs.ext4 /dev/sdb1", "blkid /dev/sdb1"],
            parts: [
              ["mkfs.xfs", "build an XFS file system."],
              ["mkfs.ext4", "build ext4 instead."],
              ["mkfs on a mounted fs", "destroys the existing data — there is no undo."]
            ],
            remember: "mkfs.xfs builds the file system; XFS is the RHEL default."
          },
          {
            n: 4,
            title: "Mounting and making it permanent",
            main: "mount attaches a file system at a folder, and /etc/fstab makes that happen automatically at boot.",
            simple: [
              "The folder must exist before you mount into it.",
              "fstab is the note the system reads at every startup. Its six columns have a fixed order and getting them wrong is the usual mistake."
            ],
            example: ["mkdir /mnt/data", "mount /dev/sdb1 /mnt/data", "mount -a", "findmnt /mnt/data"],
            parts: [
              ["1. device", "what to mount — use UUID= for reliability."],
              ["2. mount point", "the folder it attaches to."],
              ["3. type", "xfs, ext4, swap, nfs."],
              ["4. options", "usually defaults."],
              ["5. dump", "legacy backup flag — 0."],
              ["6. fsck order", "0 for most, 1 for root."],
              ["mount -a", "apply everything in fstab — run this right after editing it."]
            ],
            remember: "Create the mount point, mount, then record it in fstab and prove it with mount -a."
          },
          {
            n: 5,
            title: "Swap space",
            main: "Swap is disk used as a stand-in for memory when RAM is exhausted.",
            simple: [
              "When RAM fills, the least-used memory moves to swap. It is far slower than RAM, so a machine leaning on swap feels sluggish — but it keeps running."
            ],
            example: ["swapon --show", "fallocate -l 2G /swapfile", "chmod 600 /swapfile", "mkswap /swapfile", "swapon /swapfile", "free -h"],
            parts: [
              ["swapon --show", "list active swap."],
              ["mkswap", "prepare the area."],
              ["swapon", "activate it."],
              ["chmod 600", "a swap file should not be world readable."],
              ["free -h", "show memory and swap together."]
            ],
            remember: "mkswap prepares swap, swapon turns it on, swapon --show lists it."
          }
        ]
      }
    ],
    revision: [
      ["Inspect disks", "lsblk -f   /   blkid"],
      ["Partition", "parted /dev/sdX mklabel gpt  then  mkpart"],
      ["Format", "mkfs.xfs /dev/sdX1"],
      ["Mount", "mount /dev/sdX1 /mnt/data"],
      ["Persist", "/etc/fstab  (six columns)"],
      ["Test mounts", "mount -a"],
      ["Swap", "fallocate -> chmod 600 -> mkswap -> swapon"]
    ],
    inOneSentence: "Partition the disk, format it, mount it, record it in fstab and prove it with mount -a — and swap follows the same create-then-activate pattern."
  },

  /* ================================ Chapter 7 — managing logical volumes */
  {
    id: "rh134-07",
    book: "RH134",
    bookTitle: "RHEL Administrator Part 2",
    n: 7,
    title: "Managing Logical Volumes",
    partTitle: "Chapter 7 — LVM concepts, creating and extending volumes",
    exam: "RHCSA (EX200) — logical volume management",
    source: "RH134 course material (RHEL Administrator Part 2)",
    status: "written",
    sections: [
      {
        title: "The LVM idea",
        concepts: [
          {
            n: 1,
            title: "The three layers",
            main: "LVM separates the physical disks from the volumes you use, so volumes can grow later.",
            simple: [
              "Three layers: physical volumes (real disks), a volume group (a pool spanning them), and logical volumes (the slices you mount).",
              "Because the volumes sit on a pool, you can add a disk to the pool and grow a volume into the extra space without rewriting the data."
            ],
            example: ["pvs", "vgs", "lvs"],
            parts: [
              ["PV", "physical volume — a real disk or partition prepared for LVM."],
              ["VG", "volume group — a pool combining one or more physical volumes."],
              ["LV", "logical volume — a flexible slice of the pool that you format and mount."],
              ["pvs / vgs / lvs", "list physical volumes, volume groups, logical volumes."]
            ],
            remember: "PV (real disk) -> VG (pool) -> LV (what you mount)."
          },
          {
            n: 2,
            title: "Physical and logical extents",
            main: "A volume group is chopped into physical extents, and each logical volume is carved from them in logical extents.",
            simple: [
              "The pool is broken into fixed-size chunks; a volume is handed some of those chunks.",
              "That indirection is what lets a volume grow into space added to the pool later."
            ],
            parts: [
              ["PE", "physical extent — a chunk of the volume group."],
              ["LE", "logical extent — a chunk given to one logical volume."],
              ["same size", "PE and LE are normally the same size, so one LE maps to one PE."]
            ],
            remember: "The pool is cut into physical extents; logical volumes are carved from them."
          }
        ]
      },
      {
        title: "Creating and extending",
        concepts: [
          {
            n: 3,
            title: "Creating a logical volume step by step",
            main: "Turn a partition into a PV, add it to a VG, carve an LV, then format and mount it.",
            simple: [
              "Three setup commands in a fixed order, then the same format-and-mount steps as any other file system.",
              "Running them out of order is the usual error — each layer needs the one below it to exist first."
            ],
            example: ["pvcreate /dev/sdb1", "vgcreate vg0 /dev/sdb1", "lvcreate -n data -L 20G vg0", "mkfs.xfs /dev/vg0/data", "mount /dev/vg0/data /mnt/data"],
            parts: [
              ["pvcreate", "prepare the partition to join LVM."],
              ["vgcreate vg0", "create the pool from it."],
              ["lvcreate -n NAME -L SIZE", "carve a logical volume."],
              ["-l 100%FREE", "give it all the remaining free space."],
              ["mkfs.xfs", "build a file system on the volume."]
            ],
            remember: "pvcreate, then vgcreate, then lvcreate, then mkfs — in that order."
          },
          {
            n: 4,
            title: "Extending a volume group and a logical volume",
            main: "Adding a disk to the pool creates free space, which you then hand to a logical volume.",
            simple: [
              "This is the whole point of LVM: the disk underneath changes while the files on top keep working.",
              "Growing the pool only creates room. You must also grow the volume, then the file system inside it."
            ],
            example: ["vgextend vg0 /dev/sdc1", "lvextend -r -L +10G /dev/vg0/data", "df -h /mnt/data"],
            parts: [
              ["vgextend", "add a disk into the existing pool."],
              ["lvextend -r", "grow the logical volume AND its file system in one step."],
              ["without -r", "you must run a separate command to grow the file system."],
              ["df -h", "verify the new size is visible."]
            ],
            remember: "vgextend adds space to the pool, lvextend -r hands it to the volume and its file system."
          },
          {
            n: 5,
            title: "Removing storage safely",
            main: "A physical volume can only leave the pool if none of its data is still in use.",
            simple: [
              "LVM refuses when removing it would destroy data. That refusal is a protection, not an obstacle."
            ],
            example: ["pvmove /dev/sdb1", "vgreduce vg0 /dev/sdb1", "pvremove /dev/sdb1"],
            parts: [
              ["pvmove", "relocate the data off a physical volume."],
              ["vgreduce", "take it out of the volume group."],
              ["pvremove", "wipe its LVM label so it can be used another way."]
            ],
            remember: "pvmove the data off, then vgreduce, then pvremove.",
            warning: "Removing a physical volume that still holds live data destroys it. LVM will stop you — read the message rather than forcing it."
          }
        ]
      }
    ],
    revision: [
      ["The three layers", "PV -> VG -> LV"],
      ["List each layer", "pvs  /  vgs  /  lvs"],
      ["Create", "pvcreate -> vgcreate -> lvcreate"],
      ["Grow the pool", "vgextend vg0 /dev/sdc1"],
      ["Grow the volume", "lvextend -r -L +10G /dev/vg0/data"],
      ["Safe removal", "pvmove -> vgreduce -> pvremove"]
    ],
    inOneSentence: "LVM puts a pool between the disks and the volumes you use, so a volume can grow after the fact by adding a disk to the pool and extending it."
  },

  /* =========================== Chapter 8 — advanced storage features */
  {
    id: "rh134-08",
    book: "RH134",
    bookTitle: "RHEL Administrator Part 2",
    n: 8,
    title: "Implementing Advanced Storage Features",
    partTitle: "Chapter 8 — Stratis and VDO",
    exam: "RHCSA (EX200) — layered and deduplicated storage",
    source: "RH134 course material (RHEL Administrator Part 2)",
    status: "written",
    sections: [
      {
        title: "Stratis",
        concepts: [
          {
            n: 1,
            title: "What Stratis adds",
            main: "Stratis sits on top of LVM and adds its own thin pool, snapshots and checksumming on one file system.",
            simple: [
              "LVM gives you flexible volumes. Stratis manages them as one pool with automatic snapshotting and integrity checking built in.",
              "The checksumming is the real difference: it notices when stored data no longer matches what should be there."
            ],
            example: ["stratis pool list", "stratis filesystem list", "stratis filesystem snapshot list"],
            parts: [
              ["pool", "the Stratis pool on top of the block devices."],
              ["filesystem", "the usable file system inside the pool."],
              ["snapshot", "a cheap, instant, point-in-time copy."],
              ["integrity", "automatic checksumming catches corruption."]
            ],
            remember: "Stratis is LVM plus thin snapshots plus built-in integrity checking."
          },
          {
            n: 2,
            title: "Creating a pool and a file system",
            main: "You create a pool from block devices, then a file system inside it.",
            simple: [
              "Two steps rather than four — Stratis handles the layers for you.",
              "Then it is mounted like anything else."
            ],
            example: ["stratis pool create pool1 /dev/sdb /dev/sdc", "stratis filesystem create pool1 fs1", "mount /stratis/pool1/fs1 /mnt/data"],
            parts: [
              ["stratis pool create NAME /dev/sdX ...", "build the pool from one or more block devices."],
              ["stratis filesystem create POOL NAME", "create a file system inside it."],
              ["/stratis/pool/fs", "where it appears before mounting."]
            ],
            remember: "Create the pool from block devices, then a filesystem inside it, then mount it."
          },
          {
            n: 3,
            title: "Thin provisioning and snapshots",
            main: "A thin pool allocates space as it is used, and a snapshot is an instant copy you can roll back to.",
            simple: [
              "Thin provisioning means you can declare a 100 GB file system on a pool holding 20 GB; it fills up only as real data arrives.",
              "A snapshot costs almost nothing because it records what changed rather than copying everything."
            ],
            example: ["stratis filesystem create --size 100G pool1 thinfs", "stratis filesystem snapshot create pool1 fs1 snap1"],
            parts: [
              ["--size", "the declared size, which can exceed the pool."],
              ["allocate on use", "space is consumed as data is written."],
              ["snapshot create", "take an instant point-in-time copy."],
              ["rollback", "a snapshot lets you return the file system to that moment."]
            ],
            remember: "Thin provisioning declares a size larger than the pool; snapshots are instant and cheap."
          }
        ]
      },
      {
        title: "VDO",
        concepts: [
          {
            n: 4,
            title: "What VDO does",
            main: "VDO compresses data and collapses duplicate blocks before anything is written to disk.",
            simple: [
              "A filing cabinet that squeezes each folder before storing it, and notices when the same paper has been filed twice and stores it once.",
              "Because duplicates collapse, a VDO volume reports a much larger logical size than the disk actually holds."
            ],
            example: ["vdo status", "vdo status --verbose", "lsblk"],
            parts: [
              ["compression", "shrink each block before storing."],
              ["deduplication", "store identical blocks only once."],
              ["logical size", "what the file system sees — usually larger."],
              ["physical size", "the real space taken on the disk."]
            ],
            remember: "VDO compresses and deduplicates, so the logical size is far bigger than the disk use."
          },
          {
            n: 5,
            title: "Creating a VDO volume",
            main: "You create the volume against a block device and format the logical device it exposes.",
            simple: [
              "The VDO layer sits underneath a normal file system, so once it exists you mount it exactly like any other."
            ],
            example: ["vdo create --name=vdo1 --devices=/dev/sdb --physical-size=10G --logical-size=50G", "mkfs.xfs /dev/mapper/vdo1", "mount /dev/mapper/vdo1 /mnt/data"],
            parts: [
              ["--name", "what the VDO device will be called."],
              ["--physical-size", "the real space to use."],
              ["--logical-size", "the apparent size presented to the file system."],
              ["/dev/mapper/vdo1", "the device you format and mount."]
            ],
            remember: "Create the VDO volume with physical and logical sizes, then format /dev/mapper/<name>."
          }
        ]
      }
    ],
    revision: [
      ["Stratis overview", "stratis pool list  /  filesystem list"],
      ["Create a pool", "stratis pool create pool1 /dev/sdb /dev/sdc"],
      ["Create a filesystem", "stratis filesystem create pool1 fs1"],
      ["Thin provisioning", "--size larger than the pool"],
      ["Snapshot", "stratis filesystem snapshot create pool1 fs1 snap1"],
      ["VDO status", "vdo status"],
      ["Create VDO", "vdo create --name=vdo1 --physical-size=10G --logical-size=50G"]
    ],
    inOneSentence: "Stratis gives you a pool with thin snapshots and integrity checking; VDO compresses and collapses duplicates so the logical size far exceeds the real disk use."
  },

  /* ========================= Chapter 9 — network-attached storage */
  {
    id: "rh134-09",
    book: "RH134",
    bookTitle: "RHEL Administrator Part 2",
    n: 9,
    title: "Accessing Network-Attached Storage",
    partTitle: "Chapter 9 — NFS and autofs",
    exam: "RHCSA (EX200) — NFS and automatic mounting",
    source: "RH134 course material (RHEL Administrator Part 2)",
    status: "written",
    sections: [
      {
        title: "NFS",
        concepts: [
          {
            n: 1,
            title: "What network-attached storage is",
            main: "One computer holds a folder and publishes it; other machines mount it and use it as if it were local.",
            simple: [
              "It is about sharing files, not identity — an NFS mount does not give you a home directory or a shell.",
              "The server exports a folder; the client mounts it and it appears at a normal path."
            ],
            parts: [
              ["server", "the machine that exports the folder."],
              ["client", "the machine that mounts it."],
              ["export", "what the server publishes, and to whom."]
            ],
            remember: "The server exports a folder; the client mounts it and it appears as a local path."
          },
          {
            n: 2,
            title: "NFS versions and why v4 matters",
            main: "NFSv4 is stateful and uses a single well-known port; earlier versions need extra ports and are stateless.",
            simple: [
              "NFSv3 and earlier bounce through port 2049 plus a range of dynamically allocated ports, which is why firewalling them is fiddly.",
              "NFSv4 uses one port and keeps state, so it is simpler to secure and to mount. Prefer it."
            ],
            example: ["showmount -e servera", "mount -t nfs -o vers=4 servera:/shares /mnt/nfs", "nfsstat -m"],
            parts: [
              ["showmount -e SERVER", "list the shares a server offers."],
              ["-o vers=4", "use NFSv4. Prefer this."],
              ["vers=3", "older, needs many more ports open."],
              ["nfsstat -m", "show what is currently mounted and with which options."]
            ],
            remember: "Prefer NFSv4 — one port and stateful, instead of a scatter of ports.",
            warning: "Mixing versions is a classic source of 'it mounts but I cannot see the files' — check nfsstat -m for which version actually took effect."
          },
          {
            n: 3,
            title: "Mount options that change behaviour",
            main: "The options after the comma decide how the client treats the share, especially during a server outage.",
            simple: [
              "The read/write and sync choices are straightforward. hard versus soft is the one that genuinely bites.",
              "hard keeps retrying, which is safe but can freeze your program. soft reports an error instead, which fails fast but can lose a write."
            ],
            example: ["mount -t nfs -o vers=4,rw,sync,hard servera:/shares /mnt/nfs"],
            parts: [
              ["ro / rw", "read-only or read-write."],
              ["sync", "confirm writes immediately — safer."],
              ["hard", "keep retrying when the server is down. Safe, but can hang."],
              ["soft", "report an error instead of retrying. Can lose a write."],
              ["vers=4", "use NFSv4."]
            ],
            remember: "hard is safer for data; soft fails fast but risks losing a write.",
            warning: "A hard mount to an unreachable server leaves a program frozen with no way to interrupt it. That is expected behaviour, not a fault."
          },
          {
            n: 4,
            title: "Server exports",
            main: "The server must list each folder it offers, who may use it and with which options.",
            simple: [
              "This file is the server's list of what it is willing to share. The client cannot mount anything not exported here.",
              "Run exportfs -a after editing to apply changes without a reboot."
            ],
            example: ["/srv/shares 192.168.1.0/24(rw,sync,no_subtree_check)", "exportfs -a", "exportfs -v"],
            parts: [
              ["/srv/shares", "the folder being shared."],
              ["192.168.1.0/24", "which networks may mount it."],
              ["rw", "clients may write."],
              ["sync", "confirm writes immediately."],
              ["exportfs -a", "apply every export in the file."],
              ["exportfs -v", "show what is currently exported."]
            ],
            remember: "List the folder in /etc/exports, then run exportfs -a to apply it."
          }
        ]
      },
      {
        title: "autofs",
        concepts: [
          {
            n: 5,
            title: "Why use an automounter",
            main: "autofs mounts a share only when someone uses it, and unmounts it when nobody does.",
            simple: [
              "Instead of keeping ten network shares mounted all day, autofs keeps them ready but idle.",
              "That avoids slow startup and stuck connections from mounting everything permanently."
            ],
            example: ["dnf install autofs", "systemctl enable --now autofs", "systemctl status autofs"],
            parts: [
              ["autofs", "the service that watches for use and mounts on demand."],
              ["enable --now", "start it and make it start at boot."],
              ["/etc/auto.master", "says which map file defines each mount."],
              ["/etc/auto.home", "the map file listing the actual shares."]
            ],
            remember: "autofs mounts on first use and unmounts when idle."
          },
          {
            n: 6,
            title: "Direct and indirect maps",
            main: "An indirect map puts every share under one directory; a direct map gives each its own mount point.",
            simple: [
              "Indirect: the map file lists server:/path entries, and autofs creates /mnt/nfs/<name> as you cd into them.",
              "Direct: the map file uses full mount points, so /data becomes an automounted mount in its own right.",
              "Indirect is simpler for a set of shares from one server; direct is better when the paths must look exactly as the application expects."
            ],
            example: ["# /etc/auto.master", "auto.misc   /etc/auto.misc", "", "# /etc/auto.misc (indirect)", "share1   servera:/shares/share1"],
            parts: [
              ["/etc/auto.master", "maps a mount point to a map file."],
              ["indirect map", "the file lists server:/path; subfolders appear under the mount point."],
              ["direct map", "the file lists the full mount point; each is mounted separately."],
              ["cd into it", "the mount happens on access, not at boot."]
            ],
            remember: "Indirect lists shares under one directory; direct gives each its own mount point."
          },
          {
            n: 7,
            title: "When one user can reach a share and another cannot",
            main: "An automount that works for root and fails for a normal user is almost always an NFS permission problem underneath.",
            simple: [
              "The mount itself succeeded — automount did its job. What differs is who the files belong to and what permissions they carry.",
              "Anonymous mapping, or simply restrictive ownership on the server, is the usual cause."
            ],
            example: ["ls -ln /mnt/nfs/share1", "mount | grep nfs"],
            parts: [
              ["ls -ln", "show the numeric UID and GID rather than names."],
              ["nobody / nfsnobody", "what an unmapped user appears as."],
              ["server-side ownership", "what the files actually belong to."]
            ],
            remember: "If root can reach it and a user cannot, the mount worked — the permissions underneath are the problem."
          }
        ]
      }
    ],
    revision: [
      ["See available shares", "showmount -e SERVER"],
      ["Mount a share", "mount -t nfs -o vers=4 SERVER:/path /mnt/nfs"],
      ["Check what is mounted", "nfsstat -m"],
      ["Server: export a folder", "/etc/exports  then  exportfs -a"],
      ["Server: list exports", "exportfs -v"],
      ["Automounter", "systemctl enable --now autofs"],
      ["Map files", "/etc/auto.master  and  /etc/auto.home"],
      ["hard vs soft", "hard = safe but can hang; soft = fails fast, may lose a write"]
    ],
    inOneSentence: "The server exports a folder, the client mounts it with NFSv4, and autofs makes that happen only when someone actually uses the share."
  },

  /* ============================= Chapter 10 — controlling the boot process */
  {
    id: "rh134-10",
    book: "RH134",
    bookTitle: "RHEL Administrator Part 2",
    n: 10,
    title: "Controlling the Boot Process",
    partTitle: "Chapter 10 — boot sequence, targets, password resets and recovery",
    exam: "RHCSA (EX200) — boot management and recovery",
    source: "RH134 course material (RHEL Administrator Part 2)",
    status: "written",
    sections: [
      {
        title: "The boot sequence",
        concepts: [
          {
            n: 1,
            title: "What happens when Linux starts",
            main: "Boot is a fixed sequence: firmware, bootloader, kernel, initial RAM file system, then the real root.",
            simple: [
              "Firmware hands control to the bootloader, which loads a small kernel into memory and gives it a place to find its files — the initramfs, because the real root disk is not ready yet.",
              "The kernel finishes starting, mounts the real root, and systemd takes over."
            ],
            parts: [
              ["firmware", "UEFI or BIOS — chooses the boot device."],
              ["bootloader (GRUB2)", "loads the kernel and the initramfs."],
              ["kernel", "the core; mounts the root file system."],
              ["initramfs", "a small temporary file system used before the real root is available."],
              ["systemd", "starts services and reaches the target."]
            ],
            remember: "firmware -> bootloader -> kernel -> initramfs -> root -> systemd."
          },
          {
            n: 2,
            title: "Targets and choosing one for a single boot",
            main: "A target is a named point a group of units can be started or stopped together.",
            simple: [
              "Like station names on a line: reaching the station brings everything scheduled up to that point with it.",
              "You can pick a different one for a single boot without changing the default — that is the safe way to recover."
            ],
            example: ["systemctl get-default", "systemctl set-default graphical.target", "systemctl isolate multi-user.target"],
            parts: [
              ["multi-user.target", "the normal server state — no desktop."],
              ["graphical.target", "adds a desktop."],
              ["rescue.target", "a minimal environment for repair, with most services."],
              ["emergency.target", "the most minimal environment."],
              ["systemctl isolate TARGET", "switch now, without changing the default."],
              ["at the GRUB prompt", "append systemd.unit=TARGET to boot into it once."]
            ],
            remember: "get-default shows the default; set-default changes it; isolate switches now only."
          }
        ]
      },
      {
        title: "Recovery",
        concepts: [
          {
            n: 3,
            title: "Resetting a lost root password",
            main: "Interrupt the boot, drop to a rescue environment, and reset the password there.",
            simple: [
              "At the GRUB menu you edit the kernel line to add rd.break, which gives a shell before the real system starts.",
              "That shell runs in a minimal environment with root still read-only, so you remount it read-write, reset the password, then continue."
            ],
            example: ["# at GRUB, press e and add to the linux line:", "rd.break", "", "# then in the maintenance shell:", "mount -o remount,rw /sysroot", "chroot /sysroot", "passwd root", "touch /.autorelabel", "exit", "exit"],
            parts: [
              ["rd.break", "break to a pre-root shell at the GRUB prompt."],
              ["mount -o remount,rw /sysroot", "make the real root writable."],
              ["chroot /sysroot", "move into the real root so passwd edits the real password file."],
              ["passwd root", "set the new password."],
              ["touch /.autorelabel", "schedule an SELinux relabel on the next boot."],
              ["exit twice", "leave the shell and continue booting."]
            ],
            remember: "rd.break at GRUB, remount rw, chroot, passwd, autorelabel, then boot."
          },
          {
            n: 4,
            title: "Reading logs from a previous boot",
            main: "journalctl -b -1 shows the previous boot, which is what you want after a crash or reboot.",
            simple: [
              "After a system restarts, the logs from the failure are in the previous boot's journal.",
              "Without -1 you are only looking at the current boot, which is why the interesting messages seem to have vanished."
            ],
            example: ["journalctl -b -1", "journalctl -b -1 -p err", "journalctl --list-boots", "last -x | head"],
            parts: [
              ["journalctl -b", "the current boot."],
              ["journalctl -b -1", "the previous boot."],
              ["--list-boots", "every boot the journal holds."],
              ["last -x", "show reboots and shutdowns."]
            ],
            remember: "After a restart, the failure is in the previous boot — use journalctl -b -1."
          },
          {
            n: 5,
            title: "Repairing problems that prevent booting",
            main: "A wrong /etc/fstab entry drops the system into emergency mode, and the fix is to comment out the bad line.",
            simple: [
              "systemd tries to mount everything in fstab before starting services. If one entry is wrong it refuses to continue.",
              "In emergency mode the root file system is already mounted read-write, so you can edit fstab directly and reboot."
            ],
            example: ["# at the emergency prompt:", "mount | grep ' / '", "vi /etc/fstab", "systemctl reboot"],
            parts: [
              ["emergency mode", "systemd stops before normal start because fstab could not be satisfied."],
              ["the fix", "comment out the failing line, then reboot."],
              ["prevention", "run mount -a after every fstab edit."],
              ["fsck errors", "a damaged file system may also drop you here; run fsck on the unmounted device."]
            ],
            remember: "Emergency mode usually means fstab — comment out the bad line and reboot."
          },
          {
            n: 6,
            title: "Emergency mode versus rescue mode",
            main: "Emergency gives the bare minimum; rescue gives you more of the system plus a comment on why it dropped there.",
            simple: [
              "Rescue mounts your root file system and starts a reasonable set of services; emergency gives almost nothing.",
              "Rescue is the better choice for fixing file system problems, and emergency when you need to change fstab itself."
            ],
            example: ["systemctl isolate rescue.target", "systemctl isolate emergency.target"],
            parts: [
              ["rescue.target", "root mounted, many services running. Use this for file system repair."],
              ["emergency.target", "the bare minimum. Use this when fstab itself is broken."],
              ["systemd.unit= at GRUB", "boot into either one for a single boot."]
            ],
            remember: "Rescue for file system repair; emergency when fstab itself is the problem."
          }
        ]
      }
    ],
    revision: [
      ["Default target", "systemctl get-default  /  set-default TARGET"],
      ["Switch now", "systemctl isolate TARGET"],
      ["Boot into one target once", "systemd.unit=TARGET  at the GRUB prompt"],
      ["Reset root password", "rd.break -> remount rw -> chroot -> passwd -> touch /.autorelabel"],
      ["Previous boot logs", "journalctl -b -1"],
      ["List boots", "journalctl --list-boots"],
      ["Rescue vs emergency", "rescue = repair; emergency = fix fstab"]
    ],
    inOneSentence: "Boot runs firmware, bootloader, kernel then systemd; you can break to a shell at GRUB to reset a password; and after a restart the interesting logs are in the previous boot."
  },

  /* ========================= Chapter 11 — managing network security */
  {
    id: "rh134-11",
    book: "RH134",
    bookTitle: "RHEL Administrator Part 2",
    n: 11,
    title: "Managing Network Security",
    partTitle: "Chapter 11 — firewalld and SELinux port labelling",
    exam: "RHCSA (EX200) — firewall and port security",
    source: "RH134 course material (RHEL Administrator Part 2)",
    status: "written",
    sections: [
      {
        title: "firewalld",
        concepts: [
          {
            n: 1,
            title: "How firewalld is organised",
            main: "firewalld manages the firewall using named zones, services and ports, instead of raw rules.",
            simple: [
              "A zone is a group of rules for a type of connection. Instead of writing every port by hand, you tell firewalld which named service you want allowed.",
              "Each interface is assigned a zone, and traffic arriving on it is judged by that zone's rules."
            ],
            example: ["firewall-cmd --list-all", "firewall-cmd --get-active-zones"],
            parts: [
              ["zone", "a named set of rules applied to an interface."],
              ["service", "a named bundle of ports, like ssh or http."],
              ["default zone", "used by any interface with no zone of its own."],
              ["--get-active-zones", "which zone is applied where, right now."]
            ],
            remember: "A zone groups rules for an interface; services are named bundles of ports."
          },
          {
            n: 2,
            title: "Allowing a service or a port",
            main: "Allowing a named service is usually better than allowing a raw port, because the service knows the ports it needs.",
            simple: [
              "When you add --add-service=http, firewalld opens the port that http actually uses, and keeps working when that changes.",
              "Adding a raw port is for when there is no named service for what you are running."
            ],
            example: ["firewall-cmd --zone=public --add-service=http --permanent", "firewall-cmd --zone=public --add-port=1001/tcp --permanent", "firewall-cmd --reload", "firewall-cmd --list-all"],
            parts: [
              ["--add-service=NAME", "allow a named service. Prefer this."],
              ["--add-port=PORT/PROTOCOL", "allow a raw port, e.g. 1001/tcp."],
              ["--permanent", "save it so it survives a reload."],
              ["--reload", "apply the saved rules now."],
              ["without --permanent", "the change is temporary and disappears on reload."]
            ],
            remember: "--permanent saves, --reload applies. Forgetting both is why a rule seems to vanish."
          },
          {
            n: 3,
            title: "Why a service can still be blocked after the firewall allows it",
            main: "firewalld and SELinux are independent — one opens the port, the other decides whether the process may bind to it.",
            simple: [
              "Opening the port in firewalld lets traffic through the firewall. It does not automatically satisfy SELinux.",
              "If a service starts but refuses to use its port, and the firewall is already correct, the port label is the next thing to check."
            ],
            example: ["firewall-cmd --list-ports", "semanage port -l | grep http", "ausearch -m avc -ts recent"],
            parts: [
              ["firewalld", "controls the firewall."],
              ["SELinux", "controls the label and whether the port may be used."],
              ["either one", "can stop a service on its own."]
            ],
            remember: "firewalld opens the port; SELinux labels it. A service can be blocked by either one independently.",
            warning: "A service that starts but will not bind to its port is often a SELinux port label rather than a firewall problem. Check ausearch before opening more ports."
          }
        ]
      },
      {
        title: "SELinux port labelling",
        concepts: [
          {
            n: 4,
            title: "What a port label is",
            main: "SELinux attaches a type to each port, and a process may only bind to a port carrying a type it is allowed to use.",
            simple: [
              "Think of it as a label on a door. The policy decides which label a service may use, and which port it may bind to.",
              "Running httpd on port 82 fails by default because 82 is not labelled as an HTTP port."
            ],
            parts: [
              ["port label", "the SELinux type assigned to a port."],
              ["http_port_t", "the type normally assigned to web ports."],
              ["the policy", "decides which processes may use which type."]
            ],
            remember: "A port label is the SELinux type on a port; the policy decides which processes may bind to it."
          },
          {
            n: 5,
            title: "Adding, modifying and removing a port label",
            main: "semanage port assigns a SELinux type to a port, and the change is persistent.",
            simple: [
              "Three commands cover almost everything: list, add, and delete.",
              "Without semanage, fcontext or restorecon a port has no label and most services cannot use it."
            ],
            example: ["semanage port -l | grep http", "semanage port -a -t http_port_t -p tcp 82", "semanage port -m -t http_port_t -p tcp 1001", "semanage port -d -t http_port_t -p tcp 82"],
            parts: [
              ["semanage port -l", "list which SELinux type each port carries."],
              ["-a", "add a label to a port."],
              ["-m", "modify an existing label."],
              ["-d", "delete a label."],
              ["-t TYPE", "the SELinux type to assign."],
              ["-p tcp|udp", "which protocol."]
            ],
            remember: "semanage port -a -t http_port_t -p tcp PORT, then restart the service."
          }
        ]
      }
    ],
    revision: [
      ["Zones and rules", "firewall-cmd --list-all  /  --get-active-zones"],
      ["Allow a service", "firewall-cmd --zone=public --add-service=http --permanent"],
      ["Allow a port", "firewall-cmd --add-port=1001/tcp --permanent"],
      ["Apply saved rules", "firewall-cmd --reload"],
      ["Show port labels", "semanage port -l"],
      ["Add / modify / delete a label", "semanage port -a / -m / -d -t http_port_t -p tcp PORT"],
      ["Find SELinux denials", "ausearch -m avc -ts recent"]
    ],
    inOneSentence: "firewalld decides which ports traffic can reach, SELinux decides which ports a service may bind to — and both can block you independently."
  },

  /* ============================ Chapter 12 — installing RHEL */
  {
    id: "rh134-12",
    book: "RH134",
    bookTitle: "RHEL Administrator Part 2",
    n: 12,
    title: "Installing Red Hat Enterprise Linux",
    partTitle: "Chapter 12 — Anaconda, Kickstart and virtual machines",
    exam: "RHCSA (EX200) — installation and automation",
    source: "RH134 course material (RHEL Administrator Part 2)",
    status: "written",
    sections: [
      {
        title: "Installing manually",
        concepts: [
          {
            n: 1,
            title: "What Anaconda does",
            main: "Anaconda is the installer — it partitions the disks, installs the packages and configures the system.",
            simple: [
              "It asks you a fixed sequence of questions and then performs the installation from your answers.",
              "Kickstart exists precisely to pre-answer those same questions so the installer never has to ask."
            ],
            parts: [
              ["Anaconda", "the RHEL installer."],
              ["Installation Summary", "the screen collecting all your choices before anything is written."]
            ],
            remember: "Anaconda asks a fixed sequence of questions and installs from your answers."
          },
          {
            n: 2,
            title: "Choosing media and verifying it",
            main: "The ISO must match the CPU architecture, and its checksum should be verified before you trust it.",
            simple: [
              "The installer will not check for you, and a corrupted download fails confusingly halfway through.",
              "Match the architecture — an x86_64 image will not boot on ARM."
            ],
            example: ["sha256sum rhel-10.iso"],
            parts: [
              ["sha256sum", "a fingerprint of the file; compare it with the published value."],
              ["architecture", "must match the machine's CPU."],
              ["boot media", "USB or virtual media, not a DVD."]
            ],
            remember: "Verify the checksum and match the architecture before you boot the installer."
          },
          {
            n: 3,
            title: "The Installation Summary screens",
            main: "Language, software selection, installation destination, network and root password are the decisions that matter.",
            simple: [
              "Each can be filled in by hand or pre-filled by a Kickstart file.",
              "The disk choice is the one that deserves thought — automatic partitioning can overwrite existing data."
            ],
            parts: [
              ["language and keyboard", "affect the installed system, not just the installer."],
              ["software selection", "which package groups to install."],
              ["installation destination", "where it is written — automatic or manual."],
              ["root password", "required; a weak one is rejected unless you override it."]
            ],
            remember: "Anaconda asks language, software, disk, network and root password, in that order."
          }
        ]
      },
      {
        title: "Kickstart",
        concepts: [
          {
            n: 4,
            title: "What a Kickstart file is",
            main: "A Kickstart file answers every installer question in advance so the installation runs unattended.",
            simple: [
              "Imagine writing your answers on a form once and handing the same form to every machine you build.",
              "The installer can fetch it over the network, from a USB stick, or you type its location at the boot prompt."
            ],
            example: ["ks=http://server/ks.cfg"],
            parts: [
              ["plain text", "ordinary text, not a special format."],
              ["%pre / %post", "script sections that run before and after the installation."],
              ["%packages", "the list of packages or groups to install."],
              ["ks=URL", "told to the installer at the boot prompt."]
            ],
            remember: "A Kickstart file pre-answers the installer; ks=URL tells the installer where to find it."
          },
          {
            n: 5,
            title: "Post-install scripts and validating the file",
            main: "The %post section runs after installation and is where anything the standard questions do not cover belongs.",
            simple: [
              "Creating users, writing a config file, enabling a service — none of that has an installer screen, so it all goes in %post.",
              "Validate the file before using it: an error in a Kickstart is much harder to debug than an error in a manual install."
            ],
            example: ["%post", "chroot /mnt/sysroot", "systemctl enable --now myservice", "%end", "", "ksvalidator /var/www/html/ks.cfg"],
            parts: [
              ["%post", "runs after packages are installed."],
              ["/mnt/sysroot", "where the new system lives before the first reboot."],
              ["chroot /mnt/sysroot", "move into the new system so commands work on it."],
              ["%end", "closes the section."],
              ["ksvalidator", "check the file for errors before you rely on it."]
            ],
            remember: "Put anything the installer has no screen for into %post, usually after a chroot — and validate the file first."
          },
          {
            n: 6,
            title: "Automating disk partitioning in Kickstart",
            main: "The %pre section runs before installation and is where disk work belongs, because the installer itself manages the disks.",
            simple: [
              "If you need a partition scheme that Anaconda cannot express, you write the partitioning yourself in %pre.",
              "Everything the installer will use must exist before it starts, which is exactly why this step is first."
            ],
            parts: [
              ["%pre", "runs before the installer takes over."],
              ["wipefs / parted", "clear and partition in a script."],
              ["%include / %append", "reuse content from another file or add to it."]
            ],
            remember: "%pre runs before installation — that is where custom disk work belongs."
          }
        ]
      },
      {
        title: "Virtual machines",
        concepts: [
          {
            n: 7,
            title: "What virtualization is, and KVM",
            main: "A virtual machine is a computer defined in software, given its own CPU, memory and disk as a share of the real machine.",
            simple: [
              "It behaves like a separate computer — it runs its own operating system and reboots independently — but it is really a set of files and a slice of the host's hardware.",
              "KVM is the part that talks directly to the processor's virtualisation features; QEMU is the emulator it drives."
            ],
            parts: [
              ["hypervisor", "the software that runs the guests."],
              ["guest", "the virtual machine itself."],
              ["host", "the real machine underneath."],
              ["KVM", "the in-kernel virtualisation module."],
              ["QEMU", "the user-space emulator KVM drives."]
            ],
            remember: "A VM is a software computer that borrows real hardware from its host."
          },
          {
            n: 8,
            title: "Preparing a host and verifying support",
            main: "KVM will not load unless hardware virtualisation is enabled in the firmware.",
            simple: [
              "If KVM is missing, it is usually because VT-x or AMD-V is switched off in UEFI/BIOS rather than anything wrong with RHEL.",
              "Cockpit's Machines tool gives you a browser interface for creating and running guests."
            ],
            example: ["lsmod | grep kvm", "dnf install cockpit-machines", "systemctl enable --now libvirtd"],
            parts: [
              ["lsmod | grep kvm", "confirm the modules loaded."],
              ["VT-x / AMD-V", "must be enabled in UEFI/BIOS or KVM will not load."],
              ["cockpit-machines", "the Cockpit add-on for managing virtual machines."],
              ["libvirtd", "the libvirt daemon that runs the guests."]
            ],
            remember: "KVM needs VT-x or AMD-V enabled in firmware, otherwise it will not load.",
            warning: "Do not overallocate memory. A guest assigned more RAM than the host has will fail to start or will freeze the host."
          }
        ]
      }
    ],
    revision: [
      ["Verify an image", "sha256sum FILE.iso"],
      ["Point installer at a kickstart", "ks=http://server/ks.cfg"],
      ["Kickstart pre-install", "%pre ... %end"],
      ["Kickstart post-install", "%post ... chroot /mnt/sysroot ... %end"],
      ["Validate a kickstart", "ksvalidator FILE"],
      ["Confirm KVM loaded", "lsmod | grep kvm"],
      ["Manage VMs in a browser", "dnf install cockpit-machines"]
    ],
    inOneSentence: "Verify the image before booting it; Kickstart answers the installer questions in advance and %pre/%post cover what it cannot; and a VM is a software computer borrowing real hardware from its host."
  },

  /* ============================== Chapter 13 — comprehensive review */
  {
    id: "rh134-13",
    book: "RH134",
    bookTitle: "RHEL Administrator Part 2",
    n: 13,
    title: "Comprehensive Review",
    partTitle: "Chapter 13 — course review and the two integrated labs",
    exam: "RHCSA (EX200) — revision across all objectives",
    source: "RH134 course material (RHEL Administrator Part 2)",
    status: "written",
    sections: [
      {
        title: "Review and labs",
        concepts: [
          {
            n: 1,
            title: "Review of the course",
            main: "The chapters build on each other, and the review exists to show you where the gaps are.",
            simple: [
              "Scripts and loops came first because everything later needs them. Storage, then NFS, then boot — each assumes the previous.",
              "A review that you can answer without re-reading is the real measure of what you have learned."
            ],
            parts: [
              ["self-assessed", "can you do it without notes?"],
              ["marked honestly", "the skipped items become your revision list."],
              ["practised", "doing it once on a real machine is what counts, not reading it."]
            ],
            remember: "Be honest on the review — the items you skipped are your revision list."
          },
          {
            n: 2,
            title: "Lab 1 — fixing boot issues",
            main: "Repair a boot failure, fix a bad fstab entry, change the default target and schedule a recurring backup.",
            simple: [
              "This lab deliberately combines several chapters, which is the point: real faults do not arrive neatly labelled.",
              "It is the closest thing in the course to what the exam and real work feel like."
            ],
            parts: [
              ["diagnose first", "read the status and logs before changing anything."],
              ["one change at a time", "so you know which change fixed it."],
              ["re-verify after each fix", "confirm it is genuinely working, not just running."]
            ],
            remember: "Diagnose, change one thing, re-verify — the same order every time."
          },
          {
            n: 3,
            title: "Lab 2 — file systems and storage",
            main: "Partition, build an LVM volume, mount it persistently, mount NFS, add swap, and set ACLs.",
            simple: [
              "Almost every storage chapter appears in one exercise, which is what makes it worth doing twice.",
              "The recurring theme is that each layer depends on the one below it being correct first."
            ],
            parts: [
              ["partition -> PV -> VG -> LV", "the storage order, every time."],
              ["format, then mount, then fstab", "and prove it with mount -a."],
              ["swap", "create, then make it activate at boot."],
              ["ACLs", "the last layer, after the file system is right."]
            ],
            remember: "Storage builds in layers — partition, volume, format, mount, persist — and each layer depends on the last being right."
          }
        ]
      }
    ],
    revision: [
      ["Lab approach", "diagnose -> change one thing -> verify"],
      ["The storage order", "partition -> PV -> VG -> LV -> format -> mount -> fstab"],
      ["Honest self-assessment", "skipped items are the revision list"]
    ],
    inOneSentence: "The two labs combine chapters the way real problems do; work them by diagnosing first, changing one thing at a time, and verifying it actually works."
  },
];