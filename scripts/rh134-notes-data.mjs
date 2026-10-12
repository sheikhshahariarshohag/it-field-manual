/**
 * rh134-notes-data.mjs — Part 1
 *
 * Plain-English notes for RH134 Parts 1, 3, 4, 5, 6, 7 and 8. Written in the
 * six-part shape the learner supplied as the style template:
 *   Main idea -> Simple explanation -> Example -> What each part means -> Remember
 *
 * These are written to sit BESIDE the full chapter text, never instead of it.
 * The full chapter is one click away for detail; these give the understanding.
 * Each concept keeps to roughly 100-200 words, one idea at a time, with an
 * everyday comparison wherever one helps.
 *
 * Structure per concept:
 *   n        concept number across the chapter
 *   title    the question or topic
 *   main     one sentence — the main idea
 *   simple   a few short lines, plain English, often with a comparison
 *   example  optional code block (rendered as a shell example)
 *   parts    optional [[term, meaning], ...] breakdown table
 *   remember one short sentence
 *   warning  optional callout for a real trap
 */

export const RH134_NOTES = [
  /* ==================================================== PART 1 — scripts */
  {
    id: "rh134-01",
    book: "RH134",
    bookTitle: "Red Hat Enterprise Linux Administration II",
    n: 1,
    title: "Bash Scripts, Loops and Regular Expressions",
    partTitle: "Part 1 — automating with scripts, working in bulk, finding text",
    exam: "RHCSA (EX200) — scripting and automation",
    source: "RH134 course material (Red Hat Enterprise Linux Administration II)",
    status: "written",
    sections: [
      {
        title: "Part 1 — Writing simple Bash scripts",
        concepts: [
          {
            n: 1,
            title: "What a shell script actually is",
            main: "A shell script is a text file holding a list of commands, saved so you can run the same steps the same way every time.",
            simple: [
              "Imagine writing five steps on paper and pinning the paper to the wall. Instead of remembering and retyping the five steps every morning, you just read the paper and follow it.",
              "A shell script is that paper. The shell reads the file line by line and runs each line exactly as if you had typed it yourself.",
              "The value is not the individual commands — you already know those. The value is repeatability: the same steps, in the same order, with no chance of forgetting one."
            ],
            example: [
              "#!/bin/bash",
              "# my first script",
              "date",
              "hostname",
              "uptime"
            ],
            parts: [
              ["#!/bin/bash", "the shebang line — it tells the kernel which interpreter reads the file."],
              ["date", "print the current date and time."],
              ["hostname", "print this machine's name."],
              ["uptime", "print how long the machine has been running."]
            ],
            remember: "A script is a saved list of commands you can run again, exactly the same way."
          },
          {
            n: 2,
            title: "Making a script runnable",
            main: "A new file will not run until you mark it executable.",
            simple: [
              "A file you just created is just a piece of text. The system will not treat it as a program until you give it permission to be run.",
              "Adding execute permission is what turns a text file into something you can launch by name."
            ],
            example: ["chmod +x myscript.sh", "./myscript.sh"],
            parts: [
              ["chmod", "change the permissions on a file."],
              ["+x", "add execute permission."],
              ["./myscript.sh", "run the file that sits in this folder. The ./ means 'in the folder I am in'."]
            ],
            remember: "chmod +x first, then run the file as ./name."
          },
          {
            n: 3,
            title: "Giving a script values to use",
            main: "Arguments are the values you type after the script name, and the script reads them by position.",
            simple: [
              "Think of the script name as the question and the arguments as the answers. One argument is $1, the next is $2, and so on.",
              "This is what makes one script reusable instead of hard-coded to a single job."
            ],
            example: [
              "#!/bin/bash",
              "echo \"User: $1\"",
              "echo \"Host: $2\"",
              "",
              "$ ./greet.sh student server1",
              "User: student",
              "Host: server1"
            ],
            parts: [
              ["$1", "the first value typed after the script name."],
              ["$2", "the second value."],
              ["$@", "all of the arguments together."],
              ["\"$1\"", "the quotes keep it as one value even if it contains a space."]
            ],
            remember: "$1 is the first value typed after the script name."
          }
        ]
      },
      {
        title: "Part 2 — Running commands more efficiently using loops",
        concepts: [
          {
            n: 4,
            title: "What a loop is for",
            main: "A loop runs the same block of commands once for each item in a list.",
            simple: [
              "System administration is full of repetition: check ten servers, restart three services, process every file in a folder.",
              "Without a loop you write the command out ten times. With a loop you write it once and let the loop do the repeating."
            ],
            example: ["for HOST in host1 host2 host3; do", "  ping -c1 $HOST", "done"],
            parts: [
              ["for VARIABLE in LIST", "set up the loop — take each item from LIST, one at a time."],
              ["do", "start of the commands to repeat."],
              ["$HOST", "the current item from the list."],
              ["done", "end of the loop."]
            ],
            remember: "for ... in LIST; do ... done runs the block once per item."
          },
          {
            n: 5,
            title: "Where the list of items comes from",
            main: "The real skill is knowing which expansion builds the list you need.",
            simple: [
              "The list does not have to be typed by hand. Shell expansions can build it for you — a range of numbers, files matching a pattern, or the output of another command.",
              "Picking the right one is what separates a script that handles a hundred files from one that handles three."
            ],
            example: [
              "# typed by hand",
              "for HOST in host1 host2 host3; do echo $HOST; done",
              "",
              "# a range of numbers — brace expansion",
              "for HOST in host{1..3}; do echo $HOST; done",
              "",
              "# files matching a pattern — glob",
              "for FILE in /var/log/*.log; do echo $FILE; done",
              "",
              "# output of another command — command substitution",
              "for U in $(cut -d: -f1 /etc/passwd); do echo $U; done"
            ],
            parts: [
              ["host{1..3}", "brace expansion — builds host1 host2 host3 automatically."],
              ["*.log", "glob — matches every file ending in .log."],
              ["$(command)", "command substitution — runs the command and uses its output as the list."]
            ],
            remember: "Braces build numbers, globs build filenames, $() builds from a command's output."
          }
        ]
      },
      {
        title: "Part 3 — Matching text with regular expressions",
        concepts: [
          {
            n: 6,
            title: "What a regular expression is",
            main: "A regular expression is a pattern that describes the text you want to find, not a literal word.",
            simple: [
              "A normal search looks for one exact word. A regex describes a shape — 'a number', 'the word error at the start of a line', 'five to ten characters'.",
              "grep, vim, less, sed and most scripting languages all understand regex, though the exact syntax can vary a little between tools.",
              "This is what turns scrolling through a huge log file into a single five-second command."
            ],
            example: ["grep 'ERROR' /var/log/messages", "grep -E '^Failed' /var/log/secure"],
            parts: [
              ["grep", "search text using a pattern."],
              ["-E", "use extended regular expressions (ERE)."],
              ["'...'", "the single quotes stop the shell from interpreting the pattern."]
            ],
            remember: "A regex describes a pattern of text, not one exact word."
          },
          {
            n: 7,
            title: "Anchors — matching the start or end of a line",
            main: "The ^ and $ symbols anchor a pattern to the start or the end of a line.",
            simple: [
              "Without anchors, 'Failed' matches anywhere in the line. With ^Failed it only matches if 'Failed' is the very first thing on the line.",
              "This is how you search precisely instead of getting matches you did not want."
            ],
            example: ["grep '^Failed' /var/log/secure", "grep 'accepted$' /var/log/secure"],
            parts: [
              ["^", "the pattern must be at the start of the line."],
              ["$", "the pattern must be at the end of the line."],
              ["^Failed$", "the whole line is exactly the word Failed."]
            ],
            remember: "^ pins to the start of a line, $ pins to the end."
          },
          {
            n: 8,
            title: "Character classes — matching one of several characters",
            main: "Square brackets mean 'any one of these characters'.",
            simple: [
              "Instead of writing one search per possible letter, you describe the set. This is how you match 'any digit' or 'any vowel' in one go."
            ],
            example: ["grep -E '[0-9]+' app.log        # one or more digits", "grep -E 'colou?r' app.log        # color or colour"],
            parts: [
              ["[0-9]", "any single digit from 0 to 9."],
              ["+", "one or more of the thing before it."],
              ["?", "zero or one of the thing before it (makes the previous character optional)."],
              ["[^0-9]", "any character EXCEPT a digit."]
            ],
            remember: "[a-z] is a set of letters, [0-9] is a set of digits, + means one or more."
          }
        ]
      }
    ],
    revision: [
      ["Run a script file", "./myscript.sh"],
      ["Make a script runnable", "chmod +x myscript.sh"],
      ["First / second argument", "$1  /  $2"],
      ["Loop over a list", "for X in LIST; do ... done"],
      ["Build a range", "{1..10}"],
      ["Search with a pattern", "grep -E 'pattern' file"],
      ["Pin to line start / end", "^  /  $"]
    ],
    inOneSentence: "A script saves steps so they repeat identically; a loop runs those steps over a list; a regex finds the exact line of text you need."
  },

  /* ============================ PART 3 — tuning, priority, ACLs, SELinux */
  {
    id: "rh134-03",
    book: "RH134",
    bookTitle: "Red Hat Enterprise Linux Administration II",
    n: 3,
    title: "Tuning, Process Priority, ACLs and SELinux",
    partTitle: "Part 3 — tuned, nice/renice, POSIX ACLs, and SELinux",
    exam: "RHCSA (EX200) — tuning, scheduling and mandatory access control",
    source: "RH134 course material (Red Hat Enterprise Linux Administration II)",
    status: "written",
    sections: [
      {
        title: "Part 1 — Adjusting tuning profiles with tuned",
        concepts: [
          {
            n: 1,
            title: "What tuned does",
            main: "tuned applies a whole named bundle of system settings at once, instead of you hand-tuning dozens of values.",
            simple: [
              "It is like choosing a preset on an equalizer rather than moving every slider yourself. Each profile knows which disk scheduler, CPU governor and network settings work well together for a given job."
            ],
            example: ["tuned-adm list", "tuned-adm active", "tuned-adm profile throughput-performance"],
            parts: [
              ["tuned-adm list", "show every available profile."],
              ["tuned-adm active", "show the profile currently in use."],
              ["tuned-adm profile NAME", "switch to that profile."]
            ],
            remember: "tuned applies a whole named bundle of settings at once."
          },
          {
            n: 2,
            title: "Static versus dynamic tuning",
            main: "A static profile applies settings once; a dynamic profile keeps watching and adjusts as conditions change.",
            simple: [
              "Static is setting the thermostat once and leaving it. Dynamic is a thermostat that keeps reacting as the room gets warmer or cooler.",
              "Dynamic tuning can tune hard for a busy task and relax once the system goes idle."
            ],
            parts: [
              ["static", "settings applied once, when the profile is selected."],
              ["dynamic", "tuned monitors activity and adjusts on the fly."]
            ],
            remember: "static applies once; dynamic keeps adjusting as the load changes."
          }
        ]
      },
      {
        title: "Part 2 — Influencing process scheduling with nice and renice",
        concepts: [
          {
            n: 3,
            title: "What a nice level does",
            main: "The nice level decides who gets CPU time first when processes compete.",
            simple: [
              "When there is plenty of CPU, priority barely matters. When CPU is contended — many processes wanting time — priority decides who is served first.",
              "A 'nice' process is polite: it gives way to others. A lower number means higher priority."
            ],
            example: ["nice -n 10 sleep 300 &", "renice -n 5 -p 12345"],
            parts: [
              ["-20", "highest priority — most favored by the scheduler."],
              ["0", "the default for normal processes."],
              ["19", "lowest priority — most willing to yield to others."],
              ["nice -n N cmd", "start a command with a chosen niceness."],
              ["renice -n N -p PID", "change niceness of a process already running."]
            ],
            remember: "lower number = higher priority; higher number = more polite."
          },
          {
            n: 4,
            title: "The privilege rule for changing niceness",
            main: "Only root can make a process more important; a normal user can only make their own process less important.",
            simple: [
              "You can always volunteer to give your own work away. You cannot take priority that belongs to someone else.",
              "That is why `nice -n -5 command` fails for a normal user but works for root."
            ],
            example: [
              "# as a normal user - lowering the number is REFUSED:",
              "nice -n -5 sleep 100",
              "nice: cannot set nice value for priority: Permission denied",
              "",
              "# giving up your own priority is always allowed:",
              "nice -n 5 sleep 100"
            ],
            parts: [
              ["nice -n -5 ...", "raise priority — needs root."],
              ["nice -n 5 ...", "lower priority — allowed for any user on their own process."]
            ],
            remember: "lowering a nice number (raising priority) needs root.",
            warning: "Renice another user's process, or lower a number, and it is refused. This is a deliberate safety rule, not a bug."
          }
        ]
      },
      {
        title: "Part 3 — Access Control Lists (ACLs)",
        concepts: [
          {
            n: 5,
            title: "Why normal permissions are not always enough",
            main: "Normal permissions only give you three groups — owner, group, everyone else — so they cannot say 'this one extra person also gets write'.",
            simple: [
              "Standard permissions are like a door with three keys: the owner, the team, and anyone. If you need one specific outsider to also have access, those three keys cannot express it.",
              "ACLs add any number of extra named users and named groups on top of the standard three."
            ],
            example: ["getfacl reports.txt"],
            parts: [
              ["user::rwx", "the owner's own permissions."],
              ["group::r--", "the group owner's permissions."],
              ["user:consultant3:---", "a named extra user — here given no access."],
              ["mask::rwx", "the ceiling for all named entries and the group."],
              ["other::---", "everyone else."]
            ],
            remember: "ACLs add named users and named groups on top of owner/group/other."
          },
          {
            n: 6,
            title: "Setting and removing ACLs with setfacl",
            main: "setfacl adds, changes and removes the extra named entries on a file.",
            simple: [
              "You are adding a new key to the door, or taking one away. The -m flag modifies an entry; the -x flag removes one."
            ],
            example: [
              "setfacl -m u:consultant3:rw reports.txt   # give one user rw",
              "setfacl -m g:consultants:rX reports.txt  # give a group access",
              "setfacl -m u::rwx,g:consultants:rX,o::- file # several at once",
              "setfacl -x u:consultant3 reports.txt     # remove that user",
              "setfacl -b reports.txt                    # remove all extra entries"
            ],
            parts: [
              ["-m", "add or modify an entry."],
              ["-x", "remove one named entry."],
              ["-b", "remove every extended ACL entry."],
              ["u:name:perms", "a named user entry (blank name = the file owner)."],
              ["g:name:perms", "a named group entry."],
              ["X", "capital X — give execute only if it is a directory or already executable."]
            ],
            remember: "setfacl -m adds or changes; setfacl -x removes one; setfacl -b clears all."
          }
        ]
      },
      {
        title: "Part 4 — SELinux",
        concepts: [
          {
            n: 7,
            title: "Mandatory Access Control versus Discretionary",
            main: "Normal permissions and ACLs are Discretionary — the owner decides. SELinux is Mandatory — the system policy decides, even over root.",
            simple: [
              "With normal permissions, whoever owns a file hands out access, and any process running as that owner inherits it.",
              "SELinux flips this: a process does not ask 'am I the owner?' — it asks 'does the policy allow MY type of process to do THIS action on a resource with THIS type?'. Even root can be refused."
            ],
            parts: [
              ["DAC", "Discretionary Access Control — the owner decides who gets in."],
              ["MAC", "Mandatory Access Control — the system policy decides, regardless of owner."]
            ],
            remember: "owner decides = DAC; system policy decides = MAC (SELinux)."
          },
          {
            n: 8,
            title: "Checking and changing the SELinux mode",
            main: "SELinux runs in Enforcing, Permissive or Disabled mode — enforcing blocks denials, permissive only logs them.",
            simple: [
              "Enforcing is a locked door: it refuses the action and writes a record. Permissive is the same door with the lock off — it lets you through but still writes down what it would have refused.",
              "Switching to permissive is a good way to find out whether SELinux is really what is blocking you."
            ],
            example: ["getenforce", "setenforce 0     # permissive", "setenforce 1     # enforcing"],
            parts: [
              ["Enforcing", "deny the action and log it."],
              ["Permissive", "allow the action but still log the denial."],
              ["Disabled", "SELinux turned off entirely — only at boot."],
              ["getenforce", "show the current mode."],
              ["setenforce 0/1", "switch between permissive and enforcing."]
            ],
            remember: "getenforce shows the mode; setenforce switches it between permissive and enforcing."
          },
          {
            n: 9,
            title: "File contexts and the mv-versus-cp trap",
            main: "Every file carries a SELinux label, and moving a file keeps its old label while copying gives it the new location's label.",
            simple: [
              "Think of the label as a sticker on the file saying what it is. A new file normally gets its sticker from the folder it is created in.",
              "But moving a file carries the old sticker along, even into a folder that needs a different one. This is the number one cause of 'it worked yesterday'."
            ],
            example: ["ls -Z /var/www/html", "restorecon -Rv /var/www/html"],
            parts: [
              ["user:role:type:level", "the full SELinux context; the type is what matters for file access."],
              ["mv file /new/place", "KEEPS the original context — the common problem."],
              ["cp file /new/place", "gives the NEW location's default context."],
              ["restorecon -Rv path", "reset a path's contexts back to the policy default."]
            ],
            remember: "mv keeps the old label, cp takes the new one — restorecon fixes a wrong label.",
            warning: "A file that works in one directory and is denied in another usually just has the wrong SELinux label. Check ls -Z before changing anything."
          },
          {
            n: 10,
            title: "Booleans — safe switches for policy",
            main: "Booleans are pre-built on/off switches that let a known policy behave differently without writing custom rules.",
            simple: [
              "Should the web server be allowed to serve files out of users' home folders? That is exactly one boolean — httpd_enable_homedirs — instead of hand-building a policy."
            ],
            example: ["getsebool -a", "getsebool httpd_enable_homedirs", "setsebool httpd_enable_homedirs on", "setsebool -P httpd_enable_homedirs on"],
            parts: [
              ["getsebool -a", "list every boolean and its state."],
              ["setsebool NAME on", "change it for this boot only."],
              ["setsebool -P NAME on", "change it and make it persist."]
            ],
            remember: "setsebool changes for this boot; setsebool -P also makes it permanent."
          },
          {
            n: 11,
            title: "Working through an SELinux denial",
            main: "There is a right order to investigate a denial, and it starts by asking whether SELinux is actually wrong.",
            simple: [
              "A web server trying to read /home might be exactly the attack SELinux exists to stop. Do not reflexively 'fix' every denial.",
              "Work from the most common and least risky cause to the most drastic."
            ],
            parts: [
              ["1", "ask whether SELinux is actually wrong here."],
              ["2", "check for a wrong file context — ls -Z — and fix with restorecon (least risky)."],
              ["3", "check whether a documented boolean covers it."],
              ["4", "only as a last resort, add a custom rule with audit2allow."]
            ],
            remember: "fix the label before the boolean, and the boolean before writing policy."
          }
        ]
      }
    ],
    revision: [
      ["Show / switch tuned profile", "tuned-adm list / tuned-adm profile NAME"],
      ["Start a command with a niceness", "nice -n 10 command"],
      ["Change a running process's niceness", "renice -n 5 -p PID"],
      ["View an ACL", "getfacl FILE"],
      ["Add / remove an ACL entry", "setfacl -m ... / setfacl -x ..."],
      ["Show SELinux mode", "getenforce"],
      ["Switch SELinux mode", "setenforce 0 | 1"],
      ["Show a file's SELinux label", "ls -Z FILE"],
      ["Fix a wrong label", "restorecon -Rv PATH"],
      ["Persistent boolean change", "setsebool -P NAME on"]
    ],
    inOneSentence: "tuned applies bundles of settings; nice/renice decides who waits; ACLs add named users and groups; SELinux is a system policy that can refuse even root."
  },

  /* ==================================== PART 4 — disks, filesystems, swap, LVM */
  {
    id: "rh134-04",
    book: "RH134",
    bookTitle: "Red Hat Enterprise Linux Administration II",
    n: 4,
    title: "Partitioning, Filesystems, Swap and LVM",
    partTitle: "Part 4 — splitting disks, creating filesystems, and growing storage with LVM",
    exam: "RHCSA (EX200) — storage and logical volume management",
    source: "RH134 course material (Red Hat Enterprise Linux Administration II)",
    status: "written",
    sections: [
      {
        title: "Part 1 — Partitioning a disk",
        concepts: [
          {
            n: 1,
            title: "What partitioning does",
            main: "Partitioning divides one physical disk into separate areas, each usable as its own disk.",
            simple: [
              "Think of one large warehouse divided into labelled rooms. Each room can hold a different kind of stock, and you can wipe one room without touching the others.",
              "You need separate partitions so the system area, swap and your data do not have to share one space — so filling up data does not fill up the system."
            ],
            example: ["lsblk", "fdisk -l /dev/sdb"],
            parts: [
              ["/boot/efi", "small partition holding the bootloader files."],
              ["/boot", "kernel and initial RAM filesystem."],
              ["swap", "spare memory used when RAM is full."],
              ["LVM", "one large area that can be split or grown later."]
            ],
            remember: "partitioning splits one disk into separate areas, each usable on its own."
          },
          {
            n: 2,
            title: "The GPT partition table and its three tools",
            main: "fdisk is for small jobs, parted for most, and gdisk is the GPT-friendly front end.",
            simple: [
              "GPT is the modern way to record partitions. It stores partition boundaries in a table rather than as small markers inside the disk, which makes it far more resilient when a partition is resized or moved."
            ],
            example: ["gdisk /dev/sdb", "parted /dev/sdb", "fdisk /dev/sdb"],
            parts: [
              ["gdisk", "an fdisk-style tool that talks GPT — the usual choice for new work."],
              ["parted", "more general; can create GPT or MBR tables."],
              ["fdisk", "older, works with MBR; still fine for a quick partition."]
            ],
            remember: "gdisk for GPT, parted for either layout, fdisk for the old MBR style."
          },
          {
            n: 3,
            title: "Format and mount a new partition",
            main: "A new partition is empty until you put a filesystem on it, and you reach it only after mounting it.",
            simple: [
              "A partition is an empty room. Formatting builds the shelves inside it (the filesystem). Mounting is opening the door so you can put things in.",
              "Two separate steps — formatting is undone only by destroying the data, mounting is undone by unmounting."
            ],
            example: ["mkfs.xfs /dev/sdb1", "mount /dev/sdb1 /mnt/data"],
            parts: [
              ["mkfs.xfs", "build an XFS filesystem on the partition."],
              ["mount", "attach the filesystem to a folder so you can use it."],
              ["/mnt/data", "the folder it is attached to — the mount point."]
            ],
            remember: "format builds the filesystem, mount attaches it to a folder."
          }
        ]
      },
      {
        title: "Part 2 — Persistent mounts with /etc/fstab",
        concepts: [
          {
            n: 4,
            title: "Making a mount survive a reboot",
            main: "/etc/fstab lists what to mount automatically at boot.",
            simple: [
              "A manual mount is forgotten when you reboot. fstab is the note the system reads at every startup, so the folder is there when you arrive.",
              "The file has six columns and getting the order wrong is the usual mistake."
            ],
            example: ["/dev/sdb1   /mnt/data   xfs   defaults   0   0"],
            parts: [
              ["1. device", "what to mount, e.g. /dev/sdb1 or a UUID."],
              ["2. mount point", "the folder to attach it to."],
              ["3. filesystem type", "xfs, ext4, swap, nfs."],
              ["4. options", "usually defaults."],
              ["5. dump", "legacy backup flag — 0."],
              ["6. pass", "filesystem check order — 0 for most, 1 for root."]
            ],
            remember: "fstab columns are: device, mount point, type, options, dump, fsck order."
          },
          {
            n: 5,
            title: "Test fstab before you reboot",
            main: "mount -a applies everything in fstab, so a typo becomes a boot problem.",
            simple: [
              "If fstab has a mistake, the system may try to mount something that is not there and stop partway through boot.",
              "Running mount -a while you still have a shell catches that now, instead of at the next restart."
            ],
            example: ["mount -a"],
            parts: [["mount -a", "mount everything listed in /etc/fstab — run it right after editing fstab."]],
            remember: "edit fstab, then run mount -a to prove it works before you reboot."
          },
          {
            n: 6,
            title: "Swap space",
            main: "Swap is disk used as a substitute for memory when RAM runs out.",
            simple: [
              "When RAM is full, the system moves the least-used memory to swap. It is far slower than RAM, so a machine leaning on swap feels sluggish — but it keeps running instead of crashing.",
              "Swap can be a file or a partition."
            ],
            example: ["swapon --show", "fallocate -l 2G /swapfile", "mkswap /swapfile", "swapon /swapfile"],
            parts: [
              ["swapon --show", "list active swap."],
              ["mkswap", "prepare the area to be used as swap."],
              ["swapon", "activate it."],
              ["fallocate -l 2G", "create a 2 GB file quickly."]
            ],
            remember: "mkswap prepares swap, swapon turns it on, swapon --show lists it."
          }
        ]
      },
      {
        title: "Part 3 — LVM",
        concepts: [
          {
            n: 7,
            title: "The LVM three-layer idea",
            main: "LVM separates the disks from the volumes you actually use, so you can grow them later.",
            simple: [
              "Three layers: physical volumes (your real disks), a volume group (a pool that spans all of them), and logical volumes (the slices you mount).",
              "Because the logical volumes sit on a pool, you can add a bigger disk to the pool and grow a volume into the extra space — without rewriting the data."
            ],
            example: ["pvs", "vgs", "lvs", "pvs; vgs; lvs"],
            parts: [
              ["PV — physical volume", "a real disk or partition, prepared for LVM."],
              ["VG — volume group", "a pool combining one or more physical volumes."],
              ["LV — logical volume", "a flexible slice of the pool that you format and mount."],
              ["pvs / vgs / lvs", "list physical volumes, volume groups, logical volumes."]
            ],
            remember: "PV (real disk) -> VG (pool) -> LV (what you mount)."
          },
          {
            n: 8,
            title: "Creating a logical volume",
            main: "You turn a disk into a PV, add it to a VG, then carve an LV out of the pool.",
            simple: [
              "Three setup steps in order, then the normal format-and-mount steps apply to the finished LV.",
              "Running them out of order is the usual cause of an error — each one needs the layer below it to exist first."
            ],
            example: ["pvcreate /dev/sdb1", "vgcreate vg0 /dev/sdb1", "lvcreate -n data -L 20G vg0", "mkfs.xfs /dev/vg0/data"],
            parts: [
              ["pvcreate /dev/sdb1", "prepare the partition to join LVM."],
              ["vgcreate vg0 /dev/sdb1", "create a volume group from it."],
              ["lvcreate -n data -L 20G vg0", "carve a 20 GB logical volume named data."],
              ["mkfs.xfs", "build a filesystem on the new volume."]
            ],
            remember: "pvcreate, then vgcreate, then lvcreate, then mkfs."
          },
          {
            n: 9,
            title: "Growing a volume group and a logical volume",
            main: "Adding a disk to a volume group gives spare room, which you can then add to a logical volume.",
            simple: [
              "This is the whole point of using LVM: the disk underneath can change while the files on top keep working.",
              "Growing the volume group only creates free space in the pool. You must also grow the logical volume, then grow the filesystem inside it."
            ],
            example: ["vgextend vg0 /dev/sdc1", "lvextend -r -L +10G /dev/vg0/data"],
            parts: [
              ["vgextend vg0 /dev/sdc1", "add a new disk into the existing pool."],
              ["lvextend -r -L +10G ...", "grow the logical volume by 10 GB."],
              ["-r", "also grow the filesystem to match — saves a separate step."]
            ],
            remember: "vgextend adds space to the pool, lvextend -r hands that space to the volume."
          },
          {
            n: 10,
            title: "The risk when removing a disk",
            main: "Removing a disk from a volume group is only safe if none of its physical volumes are in use.",
            simple: [
              "LVM will stop you if data would be lost. That refusal is a protection, not an obstacle.",
              "Move the data off first, or use the tool that relocates it for you."
            ],
            example: ["vgreduce vg0 /dev/sdb1", "pvmove /dev/sdb1"],
            parts: [
              ["vgreduce", "take a physical volume out of a volume group."],
              ["pvmove", "relocate the data off a physical volume before removing it."]
            ],
            remember: "pvmove the data off first, then vgreduce the disk out.",
            warning: "Pulling a disk that still holds live LVM data destroys it. vgreduce refuses when it would be unsafe — read the message rather than forcing it."
          }
        ]
      }
    ],
    revision: [
      ["Partition a new disk", "gdisk /dev/sdb"],
      ["Build a filesystem", "mkfs.xfs /dev/sdb1"],
      ["Mount it", "mount /dev/sdb1 /mnt/data"],
      ["Persist mounts", "/etc/fstab"],
      ["Test mounts", "mount -a"],
      ["List swap", "swapon --show"],
      ["View LVM layers", "pvs / vgs / lvs"],
      ["Create a logical volume", "pvcreate -> vgcreate -> lvcreate"],
      ["Grow a pool", "vgextend"],
      ["Grow a volume", "lvextend -r -L +10G"]
    ],
    inOneSentence: "Partition the disk, format it, mount it and record it in fstab; LVM adds a pool in between so volumes can grow after the fact."
  },

  /* ================================ PART 5 — Stratis, VDO, NFS, autofs */
  {
    id: "rh134-05",
    book: "RH134",
    bookTitle: "Red Hat Enterprise Linux Administration II",
    n: 5,
    title: "Layered Storage, Compression, NFS and Automounting",
    partTitle: "Part 5 — Stratis, VDO, NFS and autofs",
    exam: "RHCSA (EX200) — advanced storage and network file sharing",
    source: "RH134 course material (Red Hat Enterprise Linux Administration II)",
    status: "written",
    sections: [
      {
        title: "Part 1 — Stratis, layered storage",
        concepts: [
          {
            n: 1,
            title: "What Stratis adds over plain LVM",
            main: "Stratis sits on top of LVM and adds its own thin pool, snapshots and checksumming on one filesystem.",
            simple: [
              "LVM gives you flexible volumes. Stratis manages them as one pool with automatic snapshotting and integrity checking built in.",
              "The checksumming is the real difference: it notices when stored data no longer matches what should be there, which plain LVM cannot do."
            ],
            example: ["stratis pool list", "stratis filesystem list"],
            parts: [
              ["pool", "the Stratis pool sitting on top of the block devices."],
              ["filesystem", "the usable Stratis filesystem inside the pool."],
              ["snapshot", "a cheap, instant, point-in-time copy you can roll back to."]
            ],
            remember: "Stratis is LVM plus thin snapshots plus built-in integrity checking."
          }
        ]
      },
      {
        title: "Part 2 — VDO, compression and deduplication",
        concepts: [
          {
            n: 2,
            title: "What VDO does",
            main: "VDO compresses data and removes duplicate blocks before writing anything to disk.",
            simple: [
              "Think of a filing cabinet that squeezes each folder before storing it, and notices when you have filed the exact same paper twice and stores it once.",
              "Because duplicate blocks are collapsed, a VDO volume reports a much larger logical size than the disk actually holds."
            ],
            example: ["vdo status", "ls -l /dev/mapper/vdo-data"],
            parts: [
              ["compression", "shrink each block before storing it."],
              ["deduplication", "store identical blocks only once."],
              ["physical size", "the real space taken on the disk."],
              ["logical size", "the size the filesystem sees — usually larger."]
            ],
            remember: "VDO compresses and deduplicates, so logical size is bigger than the real disk use."
          }
        ]
      },
      {
        title: "Part 3 — Mounting NFS",
        concepts: [
          {
            n: 3,
            title: "NFS in one idea",
            main: "NFS shares a directory from one machine so other machines can mount it like a local folder.",
            simple: [
              "One computer holds the folder; others reach across the network and use it as if it were their own disk.",
              "It is about sharing files, not identity — an NFS mount does not give the user a home directory or a shell."
            ],
            parts: [
              ["server", "the machine that exports the folder."],
              ["client", "the machine that mounts the exported folder."],
              ["export", "what the server publishes and to whom."]
            ],
            remember: "the server exports a folder; the client mounts it and it appears as a local path."
          },
          {
            n: 4,
            title: "Client mount options that matter",
            main: "The option names after the comma tell the client how to treat the share.",
            simple: [
              "The mount type and options decide whether a failure leaves you hanging or safely disconnected. For a laptop or desktop, hard is dangerous; soft can hide data loss."
            ],
            example: ["mount -t nfs server:/share /mnt/nfs -o ro,soft"],
            parts: [
              ["ro / rw", "mount read-only or read-write."],
              ["hard", "keep retrying if the server is down — safe, but can hang the program."],
              ["soft", "report an error instead of retrying — can lose data on a failed write."],
              ["vers=4", "use NFS version 4, which is stateful and better secured."]
            ],
            remember: "hard is safer for data, soft fails faster but risks losing a write.",
            warning: "A hard NFS mount to an unreachable server can leave a program frozen with no way to interrupt it. That is expected behaviour, not a fault."
          },
          {
            n: 5,
            title: "Server exports with /etc/exports",
            main: "The server must list each folder it offers, who may use it and with which options.",
            simple: [
              "This file is the server's list of what it is willing to share. The client cannot mount anything that is not exported here.",
              "Use exportfs -a after editing to apply changes without a reboot."
            ],
            example: ["/srv/share 192.168.0.0/24(rw,sync,no_subtree_check)", "exportfs -a", "exportfs -v"],
            parts: [
              ["/srv/share", "the folder being shared."],
              ["192.168.0.0/24", "which networks may mount it."],
              ["rw", "clients may write."],
              ["sync", "confirm writes immediately — safer."],
              ["exportfs -a", "apply every export in the file."],
              ["exportfs -v", "show what is currently exported."]
            ],
            remember: "list the folder in /etc/exports, then run exportfs -a to apply it."
          }
        ]
      },
      {
        title: "Part 4 — Automounting with autofs",
        concepts: [
          {
            n: 6,
            title: "Why automount is better than many mounts",
            main: "autofs mounts a share only when someone actually uses it, and unmounts it when nobody does.",
            simple: [
              "Instead of keeping ten network shares mounted all day, autofs keeps them ready but idle. The mount appears the moment you open the folder and disappears again when you stop using it.",
              "That avoids the slow startup and stuck connections you get from mounting everything permanently."
            ],
            example: ["systemctl enable --now autofs", "automount"],
            parts: [
              ["autofs", "the service that watches for use and mounts on demand."],
              ["/etc/auto.master", "says which map file defines each mount."],
              ["/etc/auto.home", "the map file listing the actual shares."]
            ],
            remember: "autofs mounts on first use and unmounts when idle."
          },
          {
            n: 7,
            title: "How to move a mount between hosts with autofs",
            main: "A map entry can list more than one server, and autofs tries them in order.",
            simple: [
              "Put the preferred server first and the fallback after it, separated by a hyphen. If the first is unreachable, the client falls through to the second instead of failing.",
              "Use a vertical bar instead and it stops at the first failure without trying the rest."
            ],
            example: ["remote  -server1:/share,server2:/share"],
            parts: [
              ["-", "try each server in turn until one answers."],
              ["|", "fail immediately on the first error."],
              ["&", "try all servers and mount them together (multi-mount)."]
            ],
            remember: "a hyphen means fall back to the next server; a pipe means stop at the first failure."
          }
        ]
      }
    ],
    revision: [
      ["Stratis overview", "stratis pool list"],
      ["VDO status", "vdo status"],
      ["Mount an NFS share", "mount -t nfs server:/share /mnt/nfs"],
      ["List server exports", "exportfs -v"],
      ["Apply exports", "exportfs -a"],
      ["Enable automounting", "systemctl enable --now autofs"],
      ["autofs map master", "/etc/auto.master"],
      ["Server failover separator", "-  (try next)"]
    ],
    inOneSentence: "Stratis and VDO make storage smarter about snapshots and duplicate data; NFS shares folders across machines; autofs mounts them only when used."
  },

  /* ================================================ PART 6 — boot and firewall */
  {
    id: "rh134-06",
    book: "RH134",
    bookTitle: "Red Hat Enterprise Linux Administration II",
    n: 6,
    title: "The Boot Process, Password Resets, Repairs and firewalld",
    partTitle: "Part 6 — what happens at boot, fixing a broken boot, and the firewall",
    exam: "RHCSA (EX200) — boot management, recovery and firewall",
    source: "RH134 course material (Red Hat Enterprise Linux Administration II)",
    status: "written",
    sections: [
      {
        title: "Part 1 — The boot process, step by step",
        concepts: [
          {
            n: 1,
            title: "From power button to login prompt",
            main: "Boot is a fixed sequence: firmware, bootloader, kernel, initial RAM filesystem, then the real root filesystem.",
            simple: [
              "Power on loads the firmware, which hands control to the bootloader. The bootloader loads a small kernel into memory and gives it a place to find its files — usually the initial RAM filesystem, because the real root disk is not ready yet.",
              "The kernel finishes starting, mounts the real root filesystem, and systemd takes over and starts services until you get a login prompt.",
              "Knowing the order matters because each stage logs to a different place."
            ],
            example: ["systemctl get-default", "journalctl -b", "systemd-analyze blame"],
            parts: [
              ["firmware", "UEFI or BIOS — chooses the boot device."],
              ["bootloader (GRUB2)", "loads the kernel and the initramfs."],
              ["kernel", "the core; mounts the root filesystem."],
              ["initramfs", "a small temporary filesystem used before the real root is available."],
              ["systemd", "starts services and reaches the target."]
            ],
            remember: "firmware -> bootloader -> kernel -> initramfs -> root filesystem -> systemd."
          },
          {
            n: 2,
            title: "systemd targets",
            main: "A target is a named point that a group of units can be started or stopped together.",
            simple: [
              "Think of targets as station names on a line. Reaching the station brings everything scheduled up to that point with it.",
              "There is a multi-user target for a normal server and a graphical target for a desktop."
            ],
            example: ["systemctl get-default", "systemctl set-default graphical.target", "systemctl isolate multi-user.target"],
            parts: [
              ["multi-user.target", "the normal server state — no desktop."],
              ["graphical.target", "adds a desktop."],
              ["rescue.target", "a minimal environment for repair."],
              ["emergency.target", "the most minimal environment, just enough to repair the root filesystem."],
              ["systemctl isolate TARGET", "switch to a target now, without changing the default."]
            ],
            remember: "systemctl get-default shows the default target; set-default changes it; isolate switches now only."
          },
          {
            n: 3,
            title: "Resetting a forgotten root password",
            main: "You interrupt the boot, enter a rescue environment, and reset the password there.",
            simple: [
              "At the GRUB menu you can edit the kernel line to add rd.break, which drops you to a shell before the real system starts.",
              "That shell runs in a minimal environment with the root filesystem still read-only, so you remount it read-write, then reset the password and continue the boot.",
              "This is the standard way in when nobody can log in."
            ],
            example: [
              "# at the GRUB menu, press e and add to the linux line:",
              "rd.break",
              "",
              "# then, in the maintenance shell:",
              "mount -o remount,rw /sysroot",
              "chroot /sysroot",
              "passwd root",
              "touch /.autorelabel",
              "exit",
              "exit"
            ],
            parts: [
              ["rd.break", "break to a pre-root shell at the GRUB prompt."],
              ["mount -o remount,rw /sysroot", "make the real root writable."],
              ["chroot /sysroot", "move into the real root so passwd edits the real password file."],
              ["passwd root", "set the new password."],
              ["touch /.autorelabel", "schedule an SELinux relabel on next boot."]
            ],
            remember: "rd.break at GRUB, remount rw, chroot, passwd, autorelabel, boot.",
            warning: "Forgetting the /.autorelabel step after a chroot password reset can leave SELinux denying logins afterwards."
          },
          {
            n: 4,
            title: "Fixing a boot that breaks because of /etc/fstab",
            main: "A bad fstab entry can drop the system into emergency mode, and the fix is to comment out the bad line.",
            simple: [
              "systemd tries to mount everything in fstab before starting services. If one entry is wrong, it refuses to continue and drops to emergency mode so you can fix it.",
              "In that mode the root filesystem is already mounted read-write, so you can edit fstab directly and reboot."
            ],
            example: [
              "# you land at an emergency shell - root is already writable:",
              "mount | grep ' / '          # confirm root is rw",
              "vi /etc/fstab               # comment out the failing line",
              "systemctl reboot"
            ],
            parts: [
              ["emergency mode", "systemd stops before normal start because fstab could not be satisfied."],
              ["the fix", "comment out the failing line in /etc/fstab, then reboot."],
              ["prevention", "run mount -a after every fstab edit so a typo never reaches a reboot."]
            ],
            remember: "emergency mode usually means fstab — comment out the bad line and reboot."
          }
        ]
      },
      {
        title: "Part 2 — firewalld and SELinux port labels",
        concepts: [
          {
            n: 5,
            title: "How firewalld is organised",
            main: "firewalld manages the firewall using named zones, services and ports, instead of raw rules.",
            simple: [
              "A zone is a group of rules for a type of connection. Instead of writing every port by hand, you tell firewalld which named service you want allowed in that zone.",
              "Each network interface is assigned a zone, and traffic arriving on it is judged by that zone's rules."
            ],
            example: ["firewall-cmd --list-all", "firewall-cmd --get-active-zones", "firewall-cmd --zone=public --add-service=http --permanent"],
            parts: [
              ["zone", "a named set of rules applied to an interface."],
              ["service", "a named bundle of ports, like ssh or http."],
              ["--permanent", "save the change so it survives a reload."],
              ["--reload", "apply the saved ruleset immediately."],
              ["default zone", "used by any interface with no zone of its own."]
            ],
            remember: "a zone groups rules; --permanent saves; --reload applies."
          },
          {
            n: 6,
            title: "SELinux port labels",
            main: "SELinux also decides whether a process may bind to a port, based on the port's label.",
            simple: [
              "Opening the port in firewalld lets traffic through the firewall. It does not automatically make SELinux happy — SELinux separately checks that the port is labelled as belonging to that service.",
              "If a service starts and refuses to use its port, and firewalld is already correct, the port label is the next thing to check."
            ],
            example: ["semanage port -l | grep http", "semanage port -a -t http_port_t -p tcp 8000"],
            parts: [
              ["semanage port -l", "list which SELinux type each port has."],
              ["-t http_port_t", "the SELinux type you are assigning."],
              ["firewalld", "controls the firewall; SELinux controls the label. Both can block a service."]
            ],
            remember: "firewalld opens the port; SELinux labels it — a service can be stopped by either one.",
            warning: "A service that starts but refuses to bind to its port is often a SELinux port label, not a firewall problem. Check with ausearch -m avc -ts recent before opening more ports."
          }
        ]
      }
    ],
    revision: [
      ["Show default boot target", "systemctl get-default"],
      ["Change default target", "systemctl set-default TARGET"],
      ["Switch target now", "systemctl isolate TARGET"],
      ["Boot to a shell", "rd.break  (at the GRUB prompt)"],
      ["Remount real root", "mount -o remount,rw /sysroot"],
      ["Enter the real root", "chroot /sysroot"],
      ["List firewall zones", "firewall-cmd --list-all"],
      ["Allow a service", "firewall-cmd --zone=public --add-service=ssh --permanent"],
      ["Label a port for SELinux", "semanage port -a -t http_port_t -p tcp PORT"]
    ],
    inOneSentence: "Boot runs firmware, bootloader, kernel then systemd; you can break or reset it at the GRUB prompt; firewalld and SELinux can each block a service independently."
  },

  /* ================================ PART 7 — installation and virtual machines */
  {
    id: "rh134-07",
    book: "RH134",
    bookTitle: "Red Hat Enterprise Linux Administration II",
    n: 7,
    title: "Manual Install, Kickstart and Virtual Machines",
    partTitle: "Part 7 — installing RHEL, automating with Kickstart, and running virtual machines",
    exam: "RHCSA (EX200) — installation, automation and virtualisation",
    source: "RH134 course material (Red Hat Enterprise Linux Administration II)",
    status: "written",
    sections: [
      {
        title: "Part 1 — Installing manually",
        concepts: [
          {
            n: 1,
            title: "Choosing and verifying installation media",
            main: "The ISO must match the CPU architecture, and its checksum must be verified before you trust it.",
            simple: [
              "Before booting anything, check the file's checksum — the installer will not, and a corrupted download fails in confusing ways halfway through.",
              "Match the architecture: an x86_64 image will not boot on ARM, and vice versa."
            ],
            example: ["sha256sum rhel-10.iso"],
            parts: [
              ["checksum (sha256)", "a fingerprint of the file; compare it with the published value."],
              ["architecture", "must match the machine's CPU."],
              ["a matching value", "proves the download is complete and unmodified."]
            ],
            remember: "verify the checksum and match the architecture before you boot the installer."
          },
          {
            n: 2,
            title: "The installation option summary",
            main: "The Anaconda installer is a sequence of screens: language, software, disk, network, root password.",
            simple: [
              "Each screen can be filled in by hand, or pre-filled by a Kickstart file so the install runs unattended.",
              "The disk choice is the one that deserves thought — automatic partitioning can overwrite existing data."
            ],
            parts: [
              ["language and keyboard", "affect the installed system, not just the installer."],
              ["software selection", "picks the package groups to install."],
              ["installation destination", "where the system is written — automatic or manual."],
              ["root password", "required; a weak one is rejected unless you override it."]
            ],
            remember: "Anaconda asks language, software, disk, network and root password, in that order."
          }
        ]
      },
      {
        title: "Part 2 — Automating installation with Kickstart",
        concepts: [
          {
            n: 3,
            title: "What a Kickstart file is",
            main: "A Kickstart file answers every installer question in advance so the installation can run with no one watching.",
            simple: [
              "Imagine writing your answers on a form once, then handing the same form to every machine you build. The installer reads it and never asks you anything.",
              "The installer can fetch it from the network, a USB stick, or you can type its location at the boot prompt."
            ],
            example: ["ks=http://server/ks.cfg"],
            parts: [
              ["plain text", "the file is ordinary text, not a special format."],
              ["%pre / %post", "sections that run scripts before and after the install."],
              ["%packages", "the list of packages or groups to install."],
              ["ks=URL", "told to the installer at the boot prompt, telling it where to fetch the file."]
            ],
            remember: "a Kickstart file pre-answers the installer; ks=URL tells the installer where to find it."
          },
          {
            n: 4,
            title: "Post-install scripts",
            main: "The %post section runs after installation and is where you put anything the standard questions do not cover.",
            simple: [
              "Some setup has no installer screen — creating users, writing a config file, enabling a service. That all goes in %post.",
              "Until the first reboot the installed system is still mounted under /mnt/sysroot, so you often chroot into it first to use familiar commands."
            ],
            example: ["%post", "chroot /mnt/sysroot", "systemctl enable --now myservice", "%end"],
            parts: [
              ["%post", "runs after packages are installed."],
              ["/mnt/sysroot", "where the new system lives before the first reboot."],
              ["chroot /mnt/sysroot", "move into the new system so commands work on it."],
              ["%end", "closes the section."]
            ],
            remember: "put anything the installer has no screen for into %post, usually after a chroot."
          }
        ]
      },
      {
        title: "Part 3 — Virtual machines",
        concepts: [
          {
            n: 5,
            title: "A virtual machine in plain terms",
            main: "A virtual machine is a computer defined in software, given its own CPU, memory and disk as a share of the real machine.",
            simple: [
              "It behaves like a separate computer — it can run its own operating system and be rebooted independently — but it is really a set of files and a slice of the host's real hardware.",
              "That is what makes it useful for testing, where you want a machine you can break and throw away."
            ],
            example: ["lsblk", "virsh list --all"],
            parts: [
              ["hypervisor", "the software that runs the guests."],
              ["guest", "the virtual machine itself."],
              ["host", "the real machine underneath."],
              ["virtual disk", "usually a file, or a block device."],
              ["memory", "assigned from the host; overallocating it will not work."]
            ],
            remember: "a VM is a software computer that borrows real CPU, memory and disk from the host."
          },
          {
            n: 6,
            title: "Where virtualisation support comes from",
            main: "RHEL includes KVM and QEMU, and KVM needs hardware virtualisation enabled in the firmware.",
            simple: [
              "KVM is the part that talks directly to the processor's virtualisation features; QEMU is the emulator it drives. They work together.",
              "If KVM will not load, it is usually because virtualisation is switched off in UEFI/BIOS rather than because anything is wrong with RHEL."
            ],
            example: ["lsmod | grep kvm", "systemd-detect-virt"],
            parts: [
              ["KVM", "the in-kernel virtualisation module."],
              ["QEMU", "the user-space emulator it drives."],
              ["lsmod | grep kvm", "confirm the modules loaded."],
              ["UEFI/BIOS setting", "Intel VT-x or AMD-V must be enabled for KVM to load."]
            ],
            remember: "KVM needs VT-x/AMD-V switched on in firmware, otherwise it will not load."
          }
        ]
      }
    ],
    revision: [
      ["Verify an install image", "sha256sum FILE.iso"],
      ["Point installer at a kickstart", "ks=http://server/ks.cfg"],
      ["Kickstart pre-install script", "%pre ... %end"],
      ["Kickstart post-install script", "%post ... chroot /mnt/sysroot ... %end"],
      ["Confirm KVM loaded", "lsmod | grep kvm"]
    ],
    inOneSentence: "Verify the image before booting it; Kickstart answers the installer questions in advance; a VM is a software computer borrowing real hardware from its host."
  },

  /* ============================= PART 8 — review, lab, checklist, what's next */
  {
    id: "rh134-08",
    book: "RH134",
    bookTitle: "Red Hat Enterprise Linux Administration II",
    n: 8,
    title: "Review, Integrated Lab, Checklist and What Comes Next",
    partTitle: "Part 8 — putting it together and moving to RH294",
    exam: "RHCSA (EX200) — revision and progression",
    source: "RH134 course material (Red Hat Enterprise Linux Administration II)",
    status: "written",
    sections: [
      {
        title: "Part 1 — Review and the integrated lab",
        concepts: [
          {
            n: 1,
            title: "How to use the integrated lab",
            main: "The lab gives you a server that is deliberately broken in several ways, and your job is to find every fault.",
            simple: [
              "Rather than answering questions, you are handed a machine and asked to repair it. It is the closest thing in the course to what the exam and real work feel like.",
              "Work methodically: check what the service actually is doing first, then read the logs, then change one thing at a time."
            ],
            parts: [
              ["diagnose first", "read the status and logs before changing anything."],
              ["one change at a time", "so you know which change fixed it."],
              ["re-verify after each fix", "confirm the service is genuinely working, not just running."]
            ],
            remember: "diagnose, change one thing, re-verify — repeat until it actually works."
          }
        ]
      },
      {
        title: "Part 2 — The RHCSA skill checklist",
        concepts: [
          {
            n: 2,
            title: "What the checklist is for",
            main: "It is a self-check list of everything the RHCSA expects you to be able to do unaided.",
            simple: [
              "Go through it honestly. Anything you cannot do without looking it up is not yet learned, regardless of how much you have read.",
              "Mark each item and come back to the ones you skipped — that list is what to revise, not what you already know."
            ],
            example: ["scheduling (at, cron)", "storage (LVM, swap, mounts)", "SELinux (contexts, booleans)", "networking (NFS, firewalld)"],
            parts: [
              ["self-assessed", "can you do it without notes?"],
              ["marked honestly", "the skipped items become your revision list."],
              ["practised", "doing it once on a real machine is what counts, not reading it."]
            ],
            remember: "be honest on the checklist — the skipped items are your revision list."
          },
          {
            n: 3,
            title: "What RH294 changes next",
            main: "RH294 (RHEL 9 Administration III) goes deeper and broader than RH134.",
            simple: [
              "RH134 is about running and repairing systems. RH294 assumes you can already do that and adds the things a larger environment needs: automating at scale, securing more deeply, and running containers.",
              "Everything in RH134 remains the foundation — this is not a replacement, it is the next layer on top."
            ],
            parts: [
              ["scale", "running many hosts consistently — Ansible and automation."],
              ["security", "hardening, certificates, identity."],
              ["containers", "running and packaging applications in containers."],
              ["foundation", "RH134 skills are assumed, not re-taught."]
            ],
            remember: "RH134 teaches you to run systems; RH294 assumes that and scales it up."
          }
        ]
      }
    ],
    revision: [
      ["Approach a broken service", "status -> logs -> one change -> re-verify"],
      ["Be honest on the skill checklist", "skipped items = revision list"]
    ],
    inOneSentence: "The lab tests whether you can actually repair a system, the checklist shows what to revise, and RH294 takes the same skills and scales them up."
  },
];