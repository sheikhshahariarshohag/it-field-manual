/**
 * notes-data-rh124-b.mjs — RH124 Chapters 6-11
 *
 * Plain-English notes in the six-part shape the learner set as the template:
 *   Main idea -> Simple explanation -> Example -> What each part means -> Remember
 *
 * These sit BESIDE the full chapter text, never instead of it.
 *
 * CURRENCY NOTE, applies to this whole book
 * The source guide is written for RHEL 8. The exam target (EX200) is based on
 * RHEL 10, and these notes were checked against a live RHEL 10.2 host. Core
 * RH124 has not moved; where a difference matters it is flagged rather than
 * quietly rewritten.
 */

export const RH124_NOTES_B = [
  /* ============================================ Ch 6 — users and groups */
  {
    id: "rh124-07",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 6,
    title: "Managing Local Users and Groups",
    partTitle: "Chapter 6 — accounts, superuser access, passwords and account restriction",
    exam: "RHCSA (EX200) — 3.1-3.5 managing users and groups",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "Users, groups and identity",
        concepts: [
          {
            n: 1,
            title: "Why every process has a user",
            main: "Every running program belongs to a user, and every file is owned by a user — that ownership is the basis of all Linux security.",
            simple: [
              "Because each process has an identity, the system can answer one question for any action: who is asking?",
              "Permissions then decide what that identity may do. Identity plus permissions is the whole model."
            ],
            parts: [
              ["UID 0", "the superuser, root. One UID, unlimited power."],
              ["1-999 (system)", "reserved for services; never for people."],
              ["1000+ (regular)", "normal human accounts."],
              ["/etc/passwd", "every account's name and UID."],
              ["/etc/group", "every group and its members."]
            ],
            remember: "Every process and every file has an owner — identity is the basis of all permissions."
          },
          {
            n: 2,
            title: "Primary and supplementary groups",
            main: "Every user has one primary group, and can belong to any number of extra groups.",
            simple: [
              "Your primary group is your main team — it owns files you create. Supplementary groups are extra teams you are a member of.",
              "This is why `id` is more informative than `whoami`: it shows all of them at once."
            ],
            example: ["id", "id alice", "groups"],
            parts: [
              ["id", "show your own UID and every group you belong to."],
              ["primary group", "shown as 'group' — owns new files you create."],
              ["groups", "the supplementary list."],
              ["whoami", "only your username — less informative than id."]
            ],
            remember: "One primary group owns your new files; supplementary groups just add access."
          }
        ]
      },
      {
        title: "Becoming root",
        concepts: [
          {
            n: 3,
            title: "Do not log in as root directly",
            main: "Red Hat's guidance is to log in as a normal user and escalate only when you actually need to.",
            simple: [
              "Working as root all the time means one typo is a system-wide problem. Log in as yourself, and step up briefly for the specific thing that needs it.",
              "It also gives you a record of which account actually ran sudo."
            ],
            remember: "Log in as a normal user and escalate only when needed."
          },
          {
            n: 4,
            title: "The four ways to get a root shell",
            main: "su, su -, sudo, and sudo su - each get you root, but they differ in environment and accountability.",
            simple: [
              "The difference matters: `su` without a dash keeps some of your old environment, which can quietly change how commands behave. The dash gives you root's clean environment.",
              "sudo records who asked for elevation. su on its own often does not."
            ],
            example: ["su -", "sudo -i", "sudo su -", "sudo command"],
            parts: [
              ["su -", "become root with root's environment (the dash is what matters)."],
              ["sudo command", "run one command as root, and it is logged."],
              ["sudo -i", "start a root login session — logged, and with a clean environment."],
              ["sudo su -", "become root — becomes root, which may not be logged the way you expect."]
            ],
            remember: "The dash in su - gives a clean environment; sudo leaves an audit trail."
          },
          {
            n: 5,
            title: "Managing user accounts",
            main: "A small set of commands covers creating, modifying and deleting accounts.",
            simple: [
              "Learn this table. Nearly every account question is answered by one row of it."
            ],
            example: [
              "useradd -m operator1",
              "passwd operator1",
              "usermod -aG developers operator1",
              "usermod -s /sbin/nologin serviceacct",
              "userdel -r operator1",
              "groupadd developers"
            ],
            parts: [
              ["useradd -m USER", "create a user AND its home directory. -m matters."],
              ["passwd USER", "set or change a password."],
              ["usermod -aG GRP USER", "add a user to an extra group."],
              ["usermod -s SHELL USER", "change the user's login shell."],
              ["userdel -r USER", "delete the user and their home directory."],
              ["groupadd GRP", "create a group."]
            ],
            remember: "useradd -m creates the home directory; usermod -aG adds a group."
          },
          {
            n: 6,
            title: "The -aG trap",
            main: "usermod -G without -a replaces the user's supplementary groups instead of adding to them.",
            simple: [
              "This quietly causes the exact problem it looks like it should fix: you add one group, and every other group they belonged to is erased.",
              "The 'a' stands for append. Always use it."
            ],
            parts: [
              ["usermod -G grp user", "REPLACES all supplementary groups — destructive."],
              ["usermod -aG grp user", "ADDS to the existing groups — what you almost always want."]
            ],
            remember: "Always usermod -aG. Without the a, you wipe the user's other groups.",
            warning: "Forgetting -a silently removes every other supplementary group the user had."
          }
        ]
      },
      {
        title: "Passwords and account restriction",
        concepts: [
          {
            n: 7,
            title: "Where passwords actually live",
            main: "/etc/passwd holds the account details; the encrypted password is in /etc/shadow, which only root can read.",
            simple: [
              "Splitting them means ordinary users can read the account list without ever being able to see password hashes.",
              "Nine colon-separated fields, and the second one in shadow is the hash."
            ],
            example: ["sudo cat /etc/passwd", "sudo cat /etc/shadow"],
            parts: [
              ["/etc/passwd", "name:UID:GID:GECOS:home:shell — readable by everyone."],
              ["/etc/shadow", "the encrypted password plus aging data — root only."],
              ["chage -l USER", "show a user's password age and expiry."]
            ],
            remember: "passwd for the accounts, shadow for the hashes — that split is the security."
          },
          {
            n: 8,
            title: "Locking, unlocking and expiring",
            main: "You can lock an account, unlock it, and set when a password must be changed.",
            simple: [
              "Locking does not delete anything — it just stops the password working, and the shell can be changed so the account cannot be used at all.",
              "Forcing an expiry is a normal way to demand a password change at the next login."
            ],
            example: ["passwd -l USER", "passwd -u USER", "passwd -e USER", "chage -M 90 USER", "usermod -e 2026-12-31 USER"],
            parts: [
              ["passwd -l", "lock the account (prefixes the hash with !)."],
              ["passwd -u", "unlock it."],
              ["passwd -e", "force a password change at the next login."],
              ["chage -M DAYS", "force change after this many days."],
              ["chage -m/-M/-W", "minimum age, maximum age, warn days."],
              ["usermod -e DATE", "set an account expiry date."]
            ],
            remember: "passwd -l locks, -u unlocks, -e forces a change; chage -M sets the policy."
          }
        ]
      }
    ],
    revision: [
      ["Create a user with a home dir", "useradd -m USER"],
      ["Set a password", "passwd USER"],
      ["Add to a group", "usermod -aG GRP USER"],
      ["Change login shell", "usermod -s /sbin/nologin USER"],
      ["Delete user + home", "userdel -r USER"],
      ["Create a group", "groupadd GRP"],
      ["Lock / unlock", "passwd -l  /  passwd -u USER"],
      ["Password age policy", "chage -l USER"]
    ],
    inOneSentence: "Every process and file has an owner; log in as yourself and escalate with sudo; and useradd/usermod/userdel with -m and -aG cover almost every account task."
  },

  /* ======================================== Ch 7 — controlling file access */
  {
    id: "rh124-08",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 7,
    title: "Controlling Access to Files",
    partTitle: "Chapter 7 — permissions, ownership, special bits and umask",
    exam: "RHCSA (EX200) — 4.1-4.6 managing file permissions",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "The permission model",
        concepts: [
          {
            n: 1,
            title: "Reading an ls -l line",
            main: "Every file has one owning user, one owning group, and permissions for three categories: user, group, other.",
            simple: [
              "The nine characters after the first are three groups of three, in a fixed order: user, group, other — and within each, read, write, execute."
            ],
            example: ["-rwxr-x---  1  alice  staff  4096  script.sh"],
            parts: [
              ["-", "the file type — - file, d directory, l symbolic link."],
              ["rwx", "read, write, execute for the owner."],
              ["r-x", "read and execute for the group."],
              ["---", "nothing for others."],
              ["alice", "the owning user."],
              ["staff", "the owning group."]
            ],
            remember: "-rwxr-x--- reads left to right as type, owner, group, other — each with rwx."
          },
          {
            n: 2,
            title: "Which permission actually applies",
            main: "The most specific match wins: if you are the owner, the owner permissions apply — even if you are also in the group.",
            simple: [
              "This is the rule people get wrong most often. There is no falling back to the group permissions if the owner ones are restrictive.",
              "The system checks user first, then group, then other, and stops at the first match."
            ],
            example: ["-rwx------  alice  staff", "# bob is in staff, but the file is alice's, so bob gets NOTHING"],
            parts: [
              ["step 1", "are you the owner? then owner permissions apply — stop."],
              ["step 2", "are you in the owning group? then group permissions apply — stop."],
              ["step 3", "otherwise, other permissions apply."]
            ],
            remember: "Check owner first, then group, then other — the first match wins and there is no fallback.",
            warning: "Being in a file's group grants you nothing if you also happen to be the owner and the owner bits are restrictive."
          },
          {
            n: 3,
            title: "Directories need execute, files need read",
            main: "Execute on a directory means you may enter it and list it — it is the 'right of way' through a folder.",
            simple: [
              "For a file, x means 'run it as a program'. For a directory, x means 'you may come in'.",
              "Without directory execute, listing the contents fails even with directory read."
            ],
            parts: [
              ["r on a directory", "list the names inside it."],
              ["x on a directory", "enter it, and reach files inside."],
              ["x on a file", "run it as a program."],
              ["w on a directory", "create, delete or rename entries inside it."]
            ],
            remember: "Execute on a directory is the right of way — without it, read does nothing."
          }
        ]
      },
      {
        title: "Changing permissions and ownership",
        concepts: [
          {
            n: 4,
            title: "chmod in octal",
            main: "Each category is a digit where read is 4, write is 2 and execute is 1.",
            simple: [
              "Add the numbers up. 7 is 4+2+1 (everything), 5 is 4+1 (read and execute), 6 is 4+2 (read and write).",
              "Once the three digits are familiar, you can read any permission string at a glance."
            ],
            example: ["chmod 644 file", "chmod 700 script.sh", "chmod 755 script.sh", "chmod 640 file"],
            parts: [
              ["r = 4", "read."],
              ["w = 2", "write."],
              ["x = 1", "execute."],
              ["chmod 644", "owner full, group read, others read — the common default."],
              ["chmod 700", "owner only, nobody else — right for private keys."],
              ["chmod 755", "owner full, everyone else read+execute — right for scripts and directories."]
            ],
            remember: "4 is read, 2 is write, 1 is execute — add them up per group."
          },
          {
            n: 5,
            title: "chmod in symbolic form",
            main: "You can add, remove or exactly set permissions by naming who and what.",
            simple: [
              "Think of it as a sentence: who, then do what, then what to. u g o for who, + - = for what."
            ],
            example: ["chmod u+x script.sh", "chmod g-w file", "chmod o= file", "chmod a+r file"],
            parts: [
              ["u / g / o / a", "user / group / other / all."],
              ["+ - =", "add / remove / set exactly."],
              ["chmod u+x", "give the owner execute."],
              ["chmod g-w", "take write away from the group."],
              ["chmod a+r", "give everyone read."],
              ["chmod u=rwx,go=rx", "set several at once, comma-separated."]
            ],
            remember: "chmod WHO WHAT WHICH — u/g/o/a then + - =."
          },
          {
            n: 6,
            title: "chown and chgrp",
            main: "chown changes the owner, chgrp changes the owning group — and only root may give a file away.",
            simple: [
              "Ownership is a separate thing from permissions — changing one does not change the other.",
              "Only root can set a file's owner to a different user. Changing the group is allowed for any file you own."
            ],
            example: ["chown alice file", "chown alice:staff file", "chgrp staff file", "chown -R alice:staff dir/"],
            parts: [
              ["chown USER FILE", "change the owner."],
              ["chown USER:GROUP FILE", "change both at once."],
              ["chgrp GROUP FILE", "change the owning group."],
              ["-R", "recurse into a whole directory tree."],
              ["chown user: file", "clear the group and use the user's login group."]
            ],
            remember: "chown changes owner, chgrp changes group, -R goes through a whole tree."
          },
          {
            n: 7,
            title: "The three special permission bits",
            main: "setuid, setgid and the sticky bit each change how a file or directory behaves for whoever uses it.",
            simple: [
              "They are not about access at all — they change behaviour. That is the difference worth remembering.",
              "You can spot them in ls -l where an ordinary rwx becomes s, S, or t."
            ],
            example: ["chmod 4755 file    # setuid", "chmod 2775 dir     # setgid on a directory", "chmod 1777 dir     # sticky bit"],
            parts: [
              ["setuid (4)", "a program runs with the OWNER's privileges, not yours."],
              ["setgid on a dir (2)", "new files inside inherit the DIRECTORY's group."],
              ["setgid on a file (2)", "a program runs with the GROUP's privileges."],
              ["sticky (1)", "in a shared directory, only the owner may delete their own files."],
              ["s / S / t in ls", "how they appear: lowercase s means the bit is set AND execute works."]
            ],
            remember: "setuid = run as the owner; setgid on a dir = inherit its group; sticky = only the owner can delete.",
            warning: "A capital S means setuid is set but execute is NOT — the program would not run anyway."
          },
          {
            n: 8,
            title: "umask and default permissions",
            main: "New files and folders start from a fixed baseline, then your umask removes permissions from it.",
            simple: [
              "The baseline is 666 for files and 777 for directories. Your umask is subtracted from that baseline.",
              "So a umask of 022 turns 666 into 644, and 777 into 755 — which is why almost everything you create is 644 or 755."
            ],
            example: ["umask", "umask 022", "umask 077", "umask -S"],
            parts: [
              ["umask", "show your current mask."],
              ["umask 022", "the usual: files 644, directories 755."],
              ["umask 077", "private: files 600, directories 700 — right for keys."],
              ["umask -S", "show the mask in symbolic form instead of digits."],
              ["666 baseline", "everything permitted, for files."],
              ["777 baseline", "everything permitted, for directories."]
            ],
            remember: "umask is subtracted from 666 for files and 777 for directories."
          }
        ]
      }
    ],
    revision: [
      ["Read permissions", "ls -l — type, owner, group, other"],
      ["Which applies?", "owner first, then group, then other — first match wins"],
      ["Set numerically", "chmod 644 / 700 / 755 file"],
      ["Set symbolically", "chmod u+x  g-w  a+r file"],
      ["Change owner / group", "chown USER:GRP file   /   chgrp GRP file"],
      ["Recurse", "chmod -R / chown -R"],
      ["setuid / setgid / sticky", "chmod 4xxx  2xxx  1xxx"],
      ["Show / set umask", "umask   /   umask 022"]
    ],
    inOneSentence: "Every file has one owner and one group; the first matching permission set wins with no fallback; 4/2/1 make the digits; and umask is subtracted from 666 or 777."
  },

  /* ================================== Ch 8 — monitoring and managing processes */
  {
    id: "rh124-09",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 8,
    title: "Monitoring and Managing Linux Processes",
    partTitle: "Chapter 8 — processes, job control, signals and load",
    exam: "RHCSA (EX200) — 5.1-5.4 monitoring and modifying process behaviour",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "What a process is",
        concepts: [
          {
            n: 1,
            title: "Every running program is a process",
            main: "A process is a program in motion: it has its own memory, its own identity, and a Process ID.",
            simple: [
              "The program is the recipe; the process is a cook following that recipe. You can have ten processes running the same program, each with separate memory and its own PID.",
              "The PID is how every tool refers to a specific running process."
            ],
            example: ["ps aux", "ps -ef", "ps -p 1234 -o pid,ppid,stat,cmd", "top"],
            parts: [
              ["PID", "the process ID — how you refer to one running process."],
              ["PPID", "the parent process that started it."],
              ["ps aux", "the common full listing — all users, all processes."],
              ["ps -ef", "another full-listing format."],
              ["top", "live view, refreshed continuously."],
              ["CSTAT", "the state column, explained below."]
            ],
            remember: "The program is the recipe; the process is one cook following it, with its own PID."
          },
          {
            n: 2,
            title: "The process states",
            main: "The STAT column tells you what a process is doing right now.",
            simple: [
              "Most processes are S and that is fine — S means sleeping, waiting for something. Only a few states need your attention."
            ],
            parts: [
              ["R", "running or ready to run — using CPU right now."],
              ["S", "sleeping — waiting for something. Normal and harmless."],
              ["D", "uninterruptible sleep — almost always waiting on disk I/O. A long D is a hardware or storage problem."],
              ["T", "stopped — suspended, often by Ctrl+Z."],
              ["Z", "zombie — finished, but the parent has not collected it yet."]
            ],
            remember: "R is running, S is normal sleep, D is waiting on disk, T is stopped, Z is a zombie."
          }
        ]
      },
      {
        title: "Job control",
        concepts: [
          {
            n: 3,
            title: "Running things in the background",
            main: "Adding & runs a command in the background and gives you your prompt straight back.",
            simple: [
              "Useful when something takes a while — a download, a long report — and you want to keep working meanwhile.",
              "It is one job, running independently of your prompt."
            ],
            example: ["sleep 300 &", "jobs", "fg %1", "bg %1", "Ctrl+Z"],
            parts: [
              ["&", "run in the background."],
              ["jobs", "list this shell's jobs."],
              ["fg %N", "bring job N back to the foreground."],
              ["bg %N", "send a stopped job back to the background."],
              ["Ctrl+Z", "suspend the foreground job, stopping it."]
            ],
            remember: "& backgrounds it, jobs lists it, fg brings it back, Ctrl+Z suspends it."
          }
        ]
      },
      {
        title: "Signals",
        concepts: [
          {
            n: 4,
            title: "What a signal is",
            main: "A signal is a software interrupt delivered to a process — a polite message telling it something.",
            simple: [
              "It is how the kernel and other processes talk to a running program. Most signals are a request to stop, and a well-written program shuts down cleanly.",
              "Sending the right signal is how you stop things properly rather than forcing them."
            ],
            parts: [
              ["SIGTERM (15)", "please stop — the polite request. Try this first."],
              ["SIGINT (2)", "interrupt — what Ctrl+C sends."],
              ["SIGKILL (9)", "the kernel kills it immediately. It cannot be caught, blocked or ignored."],
              ["SIGHUP (1)", "hang up — daemons traditionally use it to reload config."],
              ["SIGSTOP (19)", "suspend, cannot be caught or ignored."],
              ["SIGCONT (18)", "resume a stopped process."]
            ],
            remember: "SIGTERM (15) asks politely; SIGKILL (9) cannot be refused, caught or ignored."
          },
          {
            n: 5,
            title: "kill and pkill",
            main: "kill sends a signal to a process by PID, and pkill selects targets by name or attribute.",
            simple: [
              "Always try 15 first. Only escalate to 9 if the process refuses — SIGKILL gives the program no chance to clean up, which can leave corrupted data.",
              "pkill is faster but blunter: it can match more than you intended."
            ],
            example: ["kill 1234", "kill -15 1234", "kill -9 1234", "pkill -TERM httpd", "killall -u alice"],
            parts: [
              ["kill PID", "the default signal is TERM (15)."],
              ["kill -15 PID", "explicitly ask it to stop."],
              ["kill -9 PID", "force it — no cleanup possible."],
              ["pkill -TERM NAME", "signal every process matching a name."],
              ["killall -u USER", "signal every process belonging to a user."]
            ],
            remember: "kill -15 first, kill -9 only as a last resort — 9 skips cleanup entirely.",
            warning: "SIGKILL gives the process no chance to close files or flush buffers. That is how you cause corruption."
          }
        ]
      },
      {
        title: "Load and monitoring",
        concepts: [
          {
            n: 6,
            title: "Reading the load average",
            main: "Load average counts how many processes want the CPU, sampled at 1, 5 and 15 minutes.",
            simple: [
              "Think of a queue at a counter. One number means one process waiting, three means three waiting, and it rises when work arrives faster than it can be done.",
              "It is not a percentage. On a 4-CPU machine, a load of 4 is fully busy, and higher means things are queueing."
            ],
            example: ["uptime", "cat /proc/loadavg", "top", "vmstat 1"],
            parts: [
              ["1 min", "recent demand — reacts fast, can be noisy."],
              ["5 min", "the middle-ground view."],
              ["15 min", "the long trend — best for spotting a real problem."],
              ["compare to CPU count", "load above the number of CPUs means work is waiting."],
              ["uptime", "the quickest place to read it."],
              ["vmstat 1", "refresh every second — shows runnable and blocked processes."]
            ],
            remember: "Load is a queue length, not a percentage — compare it to your CPU count."
          },
          {
            n: 7,
            title: "Finding what is using the CPU",
            main: "top shows live CPU and memory use per process, and sorts by the column you choose.",
            simple: [
              "It is the first place to look when something is slow. Press P to sort by CPU, M by memory.",
              "top and ps are answers to different questions: top is right now, ps is the full picture."
            ],
            example: ["top", "top -u alice", "Shift+P", "ps aux --sort=-%cpu | head"],
            parts: [
              ["top", "live, refreshes continuously."],
              ["P then P", "in top, press Shift+P to sort by CPU."],
              ["M", "sort by memory instead."],
              ["q", "quit top."],
              ["-u USER", "restrict to one user."]
            ],
            remember: "top for right now, ps for the whole picture; Shift+P sorts by CPU."
          }
        ]
      }
    ],
    revision: [
      ["List processes", "ps aux   /   ps -ef"],
      ["Live view", "top   (Shift+P = CPU, M = memory, q = quit)"],
      ["Process states", "R running  S sleep  D disk-wait  T stopped  Z zombie"],
      ["Background a command", "cmd &"],
      ["List / control jobs", "jobs   fg %1   bg %1"],
      ["Suspend", "Ctrl+Z"],
      ["Polite stop", "kill -15 PID   /   pkill -TERM name"],
      ["Force stop", "kill -9 PID"],
      ["Load average", "uptime   /   vmstat 1"]
    ],
    inOneSentence: "A process is a running instance with its own PID and memory; signals are how you stop them politely with 15 before forcing with 9; and load is a queue length to compare against your CPU count."
  },

  /* ===================================== Ch 9 — controlling services and daemons */
  {
    id: "rh124-10",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 9,
    title: "Controlling Services and Daemons",
    partTitle: "Chapter 9 — systemd units, and starting, stopping and reloading",
    exam: "RHCSA (EX200) — 6.1-6.3 systemd service management",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "systemd and units",
        concepts: [
          {
            n: 1,
            title: "A daemon and a unit",
            main: "A daemon is a background service; systemd manages it through a unit file.",
            simple: [
              "A service that answers requests while you do something else is a daemon — sshd, chronyd, firewalld.",
              "systemd tracks each one with a unit, which is a text file describing how to start, stop and restart it."
            ],
            parts: [
              ["daemon", "a background service that keeps running."],
              ["unit", "the file systemd uses to manage it."],
              [".service", "a service unit."],
              [".socket", "listens for connections and starts the service on demand."],
              [".timer", "schedules a unit, often with a .service beside it."]
            ],
            remember: "A daemon is the running service; the unit is the file systemd uses to control it."
          },
          {
            n: 2,
            title: "Viewing service state",
            main: "systemctl status shows whether a unit is running, and systemctl is-enabled says whether it starts at boot.",
            simple: [
              "Two different questions: is it running now, and will it start on the next boot? Both matter and they are often confused.",
              "The coloured word in systemctl status tells you which: active, inactive, failed, enabled."
            ],
            example: ["systemctl status sshd", "systemctl is-active sshd", "systemctl is-enabled sshd", "systemctl list-units --type=service"],
            parts: [
              ["active (running)", "it is running right now."],
              ["inactive (dead)", "it is not running."],
              ["failed", "it tried to start and did not work — go and read the log."],
              ["enabled", "it will start at boot."],
              ["disabled", "it will not start at boot."],
              ["masked", "blocked entirely, cannot be started at all."]
            ],
            remember: "is-active is now, is-enabled is at boot — different questions."
          },
          {
            n: 3,
            title: "Comparing start, restart and reload",
            main: "reload asks the service to re-read its config; restart stops it and starts it again.",
            simple: [
              "Reload is gentle — the service keeps running and just re-reads its settings. Restart interrupts it, so existing connections drop.",
              "Using reload where it works is better for a live server, because nothing using the service notices."
            ],
            example: ["systemctl start sshd", "systemctl stop sshd", "systemctl restart sshd", "systemctl reload sshd", "systemctl enable --now sshd"],
            parts: [
              ["start / stop", "begin or end running."],
              ["restart", "stop then start — interrupts existing connections."],
              ["reload", "re-read config without stopping. Gentler."],
              ["enable / disable", "control whether it starts at boot."],
              ["--now", "do the boot action AND start/stop immediately in one command."],
              ["mask / unmask", "block a unit completely / undo that."]
            ],
            remember: "reload is gentle and keeps connections; restart interrupts them; enable --now does both boot action and start."
          },
          {
            n: 4,
            title: "Editing unit files the safe way",
            main: "Never edit a vendor unit directly — override it under /etc/systemd/system/ instead.",
            simple: [
              "Package updates replace files under /usr/lib/systemd/system/. Anything you write in /etc/systemd/system/ survives and takes priority.",
              "systemctl edit creates the override for you, with a merge block at the top."
            ],
            example: ["systemctl edit sshd", "systemctl daemon-reload", "systemctl restart sshd"],
            parts: [
              ["/usr/lib/systemd/system/", "vendor files — package updates overwrite these."],
              ["/etc/systemd/system/", "your overrides — highest priority, safe."],
              ["systemctl edit UNIT", "create an override without touching the vendor file."],
              ["systemctl revert UNIT", "remove overrides and go back to the vendor file."],
              ["daemon-reload", "tell systemd to re-read unit files after editing."]
            ],
            remember: "systemctl edit creates the override under /etc — never hand-edit /usr/lib."
          }
        ]
      }
    ],
    revision: [
      ["Check a service", "systemctl status SVC"],
      ["Now vs boot", "systemctl is-active / is-enabled SVC"],
      ["Control it", "start / stop / restart / reload SVC"],
      ["Boot behaviour", "enable --now  /  disable  /  mask SVC"],
      ["Edit safely", "systemctl edit SVC"],
      ["After editing", "systemctl daemon-reload"]
    ],
    inOneSentence: "systemd manages daemons through unit files; is-active is now while is-enabled is at boot; reload is gentle where restart interrupts; and systemctl edit keeps you out of vendor files."
  },

  /* ============================================== Ch 10 — configuring SSH */
  {
    id: "rh124-11",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 10,
    title: "Configuring and Securing SSH",
    partTitle: "Chapter 10 — host keys, key authentication and hardening sshd",
    exam: "RHCSA (EX200) — 7.1-7.2 securing with SSH",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "SSH basics",
        concepts: [
          {
            n: 1,
            title: "Host keys and that first prompt",
            main: "Every SSH server has a host key that identifies it, and your client records it the first time you connect.",
            simple: [
              "Like a fingerprint. If a machine's fingerprint changes, you are no longer talking to the same machine — which is exactly what an interception attempt looks like.",
              "Never accept a changed fingerprint without knowing why it changed."
            ],
            example: ["ssh student@servera", "ssh-keygen -R servera"],
            parts: [
              ["host key", "the server's permanent identity, stored in /etc/ssh/ssh_host_*_key.pub."],
              ["known_hosts", "the client's record of fingerprints it trusts."],
              ["the first prompt", "you are being asked to confirm that identity — read the fingerprint."],
              ["are you sure", "the client has never seen this host before."],
              ["REMOTE HOST IDENTIFICATION HAS CHANGED", "something is wrong — or the host key was legitimately regenerated."]
            ],
            remember: "The host key is the server's fingerprint — a changed fingerprint is a warning, not something to click through."
          }
        ]
      },
      {
        title: "Key-based authentication",
        concepts: [
          {
            n: 2,
            title: "How key authentication works",
            main: "A public key on the server verifies a private key you keep locally, so no password ever crosses the network.",
            simple: [
              "The private key stays on your machine and never leaves it. The public key sits in a file on the server saying which keys may log in.",
              "The server sends a challenge, your private key signs it, and the public key checks the signature. The password is never involved."
            ],
            example: ["ssh-keygen -t ed25519 -C 'lab key'", "ssh-copy-id student@servera", "ls -l ~/.ssh"],
            parts: [
              ["ssh-keygen", "generate a key pair."],
              ["~/.ssh/id_ed25519", "the private key — never copy or share this."],
              ["~/.ssh/id_ed25519.pub", "the public key — this is what goes on the server."],
              ["ssh-copy-id USER@HOST", "copy your public key and append it to the account's authorized_keys."],
              ["~/.ssh/authorized_keys", "on the server, the list of public keys allowed to log in."]
            ],
            remember: "The private key stays on your machine; only the public key goes on the server."
          },
          {
            n: 3,
            title: "Permissions that break SSH",
            main: "OpenSSH refuses keys and some files when their permissions are too loose.",
            simple: [
              "It is strict on purpose: if anyone else could read your private key or modify authorized_keys, they could log in as you.",
              "This is the single most common cause of 'my key is being ignored'."
            ],
            example: ["chmod 700 ~/.ssh", "chmod 600 ~/.ssh/id_ed25519", "chmod 600 ~/.ssh/authorized_keys"],
            parts: [
              ["chmod 700 ~/.ssh", "the directory itself — owner only."],
              ["chmod 600 private_key", "the private key must not be group or world readable."],
              ["chmod 600 authorized_keys", "else another user could add their own key."],
              ["too open", "sshd silently ignores the key and falls back to password."]
            ],
            remember: "chmod 700 ~/.ssh and 600 on both keys — sshd silently ignores keys that are too open.",
            warning: "If permissions are wrong, ssh does not say so clearly; it just ignores the key and asks for a password."
          },
          {
            n: 4,
            title: "Generating a key with a passphrase",
            main: "A passphrase encrypts the private key on disk, so a stolen key file is useless without it.",
            simple: [
              "Think of it as a second lock on the safe holding the key. Slightly slower to use, far safer if the laptop is ever lost."
            ],
            example: ["ssh-keygen -t ed25519 -C 'student@workstation'"],
            parts: [
              ["-t ed25519", "the modern, recommended key type."],
              ["-C 'comment'", "a label stored in the public key to identify it."],
              ["-N ''", "set an empty passphrase — less safe."],
              ["-a 100", "KDF rounds when setting a passphrase."]
            ],
            remember: "A passphrase encrypts the private key on disk; ed25519 is the modern type to use."
          }
        ]
      },
      {
        title: "Hardening sshd",
        concepts: [
          {
            n: 5,
            title: "Turning off password authentication",
            main: "Once keys work, you can stop accepting passwords entirely, which removes the brute-force surface.",
            simple: [
              "This is the single biggest SSH improvement. With keys working first, switching passwords off costs you nothing and closes the most attacked door.",
              "Do not do it until you have confirmed you can log in with a key in a second terminal — otherwise you can lock yourself out."
            ],
            example: ["sudo vi /etc/ssh/sshd_config", "PasswordAuthentication no", "PubkeyAuthentication yes", "sudo systemctl reload sshd"],
            parts: [
              ["PasswordAuthentication no", "refuse password logins."],
              ["PermitRootLogin no", "stop root logging in over SSH directly."],
              ["PubkeyAuthentication yes", "key login stays enabled — check this is on."],
              ["AllowUsers alice", "only these accounts may log in."],
              ["systemctl reload sshd", "apply without dropping connections."]
            ],
            remember: "PasswordAuthentication no is the biggest win — but test your key login first, or you lock yourself out."
          },
          {
            n: 6,
            title: "Validating the config before reloading",
            main: "sshd can check its configuration and tell you about errors without starting.",
            simple: [
              "A typo in sshd_config can leave the service unable to start at all, which on a remote machine means you cannot log in to fix it.",
              "Testing first is the difference between catching a typo and being locked out."
            ],
            example: ["sudo sshd -t", "sudo sshd -T | grep -i passwordauth"],
            parts: [
              ["sshd -t", "test the config — reports syntax errors, starts nothing."],
              ["sshd -T", "dump the effective settings after all defaults are applied."],
              ["exit 0", "the config is valid."],
              ["non-zero", "do not reload — fix the error first."]
            ],
            remember: "sshd -t before every reload — a typo you cannot see is how you lock yourself out.",
            warning: "Never restart sshd over a remote connection without testing the config first. You may not be able to log back in."
          }
        ]
      }
    ],
    revision: [
      ["Generate a key", "ssh-keygen -t ed25519"],
      ["Copy the public key over", "ssh-copy-id USER@HOST"],
      ["Fix key permissions", "chmod 700 ~/.ssh   /   chmod 600 keys"],
      ["Test the config", "sshd -t"],
      ["See effective settings", "sshd -T"],
      ["Reload after editing", "systemctl reload sshd"],
      ["Disable passwords", "PasswordAuthentication no"]
    ],
    inOneSentence: "The host key is the server's fingerprint; key auth keeps the private key local and only the public key on the server; and sshd -t before every reload, because a typo can lock you out."
  },

  /* ============================================ Ch 11 — analysing and storing logs */
  {
    id: "rh124-12",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 11,
    title: "Analyzing and Storing Logs",
    partTitle: "Chapter 11 — systemd-journald, rsyslog, journalctl and time",
    exam: "RHCSA (EX200) — 8.1-8.4 logging and time synchronisation",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "The two logging services",
        concepts: [
          {
            n: 1,
            title: "journald and rsyslog are not the same thing",
            main: "systemd-journald collects everything into the journal; rsyslog additionally writes the traditional text log files.",
            simple: [
              "Two services, two different jobs. journald is the modern structured store that most things write to. rsyslog is the older text-file system that tools and older software still expect.",
              "Both run by default. When a log is missing from /var/log, this split is usually why."
            ],
            example: ["systemctl status systemd-journald", "systemctl status rsyslog", "ls /var/log"],
            parts: [
              ["systemd-journald", "collects everything systemd and services report."],
              ["rsyslog", "writes /var/log/messages, secure, cron and the rest."],
              ["/var/log/messages", "general system messages."],
              ["/var/log/secure", "authentication events."],
              ["/run/log/journal", "the journal on a RAM-backed filesystem — lost on reboot."],
              ["/var/log/journal", "the journal on disk — survives reboot."]
            ],
            remember: "journald collects everything; rsyslog writes the text files in /var/log."
          },
          {
            n: 2,
            title: "Querying the journal",
            main: "journalctl reads the journal, and can filter by time, unit, priority, PID and more.",
            simple: [
              "It replaces grepping through log files. Because the journal is structured, you can filter on the fields directly rather than matching text."
            ],
            example: ["journalctl", "journalctl -u sshd", "journalctl -p err", "journalctl -f", "journalctl --since '1 hour ago'", "journalctl -b -p warning", "journalctl -k"],
            parts: [
              ["journalctl", "show everything."],
              ["-u UNIT", "one unit only."],
              ["-p PRIORITY", "filter by severity: emerg, alert, crit, err, warning, notice, info, debug."],
              ["-f", "follow new messages live — the one to leave running."],
              ["--since / --until", "filter by time."],
              ["-b", "this boot only; -b -1 is the previous boot."],
              ["-k", "kernel messages only."]
            ],
            remember: "journalctl -f to follow live, -u for a unit, -p for severity, -b for this boot."
          },
          {
            n: 3,
            title: "Making the journal survive a reboot",
            main: "If the journal lives on /run it is memory-backed and gone on reboot; moving it to /var/log makes it persistent.",
            simple: [
              "Compare the two paths. If /var/log/journal exists you already have a persistent journal; if only /run/log/journal exists, logs vanish on reboot.",
              "Persistent logs are what you need when investigating something that happened before a crash or reboot."
            ],
            example: ["ls -d /var/log/journal /run/log/journal", "sudo mkdir -p /var/log/journal", "sudo systemd-catalog-files --prefix=/var/log/journal", "sudo systemctl restart systemd-journald"],
            parts: [
              ["/run/log/journal", "memory-backed — lost on reboot. The RHEL default."],
              ["/var/log/journal", "on disk — survives reboot."],
              ["Storage=persistent", "set in journald.conf to make it permanent."]
            ],
            remember: "/run/log/journal is lost on reboot; /var/log/journal persists."
          },
          {
            n: 4,
            title: "Log rotation and the usual text files",
            main: "Old logs are compressed and rotated so they do not fill the disk.",
            simple: [
              "logrotate renames the current file, compresses it, and starts a new one. The rotated files stay as .1, .2.gz and so on.",
              "Knowing which file holds what saves hunting: secure is logins, messages is everything routine, cron is scheduled jobs."
            ],
            parts: [
              ["/var/log/messages", "general system messages."],
              ["/var/log/secure", "authentication — logins, sudo, sshd."],
              ["/var/log/cron", "scheduled job output."],
              ["logrotate", "the tool that rotates, compresses and prunes old logs."],
              ["/etc/logrotate.conf", "the policy telling it when and how long to keep."]
            ],
            remember: "secure for logins, messages for routine, cron for scheduled jobs."
          },
        ]
      },
      {
        title: "Time",
        concepts: [
          {
            n: 5,
            title: "Why accurate time matters more than it sounds",
            main: "Logs from different machines are only comparable if their clocks agree.",
            simple: [
              "When you are reconstructing what happened across several servers, mismatched clocks make the sequence a guess.",
              "Authentication also depends on time — expired certificates and Kerberos both fail if the clock is wrong."
            ],
            remember: "Logs are only comparable when the clocks agree — time is a security dependency, not just bookkeeping."
          },
          {
            n: 6,
            title: "chrony and timedatectl",
            main: "chrony keeps the clock synchronised, and timedatectl shows the current time settings.",
            simple: [
              "The system asks an upstream time server what the time should be and corrects itself gradually, rather than jumping the clock.",
              "Gradual correction matters: a sudden jump backwards can confuse running services."
            ],
            example: ["timedatectl", "timedatectl set-timezone 'Asia/Dhaka'", "chronyc tracking", "chronyc sources -v", "systemctl status chronyd"],
            parts: [
              ["timedatectl", "show and set the system's time and time zone."],
              ["chronyd", "the time daemon."],
              ["chronyc tracking", "how closely the clock is tracking."],
              ["chronyc sources -v", "which time sources are being used and whether they agree."],
              ["timezone", "set by name, not by offset — Asia/Dhaka, not +06:00."],
              ["NTP / systemd-timesyncd", "the alternative time service on newer systems."]
            ],
            remember: "chrony corrects gradually rather than jumping the clock; set time zones by name."
          }
        ]
      }
    ],
    revision: [
      ["Read the journal", "journalctl"],
      ["Follow live", "journalctl -f"],
      ["Filter by unit / severity", "journalctl -u sshd   /   -p err"],
      ["This boot / last boot", "journalctl -b   /   journalctl -b -1"],
      ["Kernel messages", "journalctl -k"],
      ["Check persistent journal", "ls -d /var/log/journal"],
      ["Show time settings", "timedatectl"],
      ["Check time sync", "chronyc tracking   /   chronyc sources -v"]
    ],
    inOneSentence: "journald collects everything and rsyslog writes the text files; journalctl filters by unit, severity and boot; and a journal under /run is lost on reboot."
  },
];