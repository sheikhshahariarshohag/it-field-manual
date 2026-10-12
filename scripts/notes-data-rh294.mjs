/**
 * notes-data-rh294.mjs — RH294 Parts 1-9
 *
 * Plain-English notes in the six-part shape the learner set as the template:
 *   Main idea -> Simple explanation -> Example -> What each part means -> Remember
 *
 * These sit BESIDE the full chapter text, never instead of it. The RH294 guide
 * is explicitly RHCE-level (EX294), building on RH134.
 *
 * CURRENCY
 * The source guide targets RHEL 9 (EX294). RH294 builds directly on the RH134
 * skills, so the RHEL 10 notes written earlier apply unchanged here.
 */

export const RH294_NOTES = [
  /* ========================================== Part 1 — what Ansible is */
  {
    id: "rh294-01",
    book: "RH294",
    bookTitle: "Red Hat Enterprise Linux Administration III",
    n: 1,
    title: "Why Automate, and What Ansible Is",
    partTitle: "Part 1 — the control node, inventory, config files and ad hoc commands",
    exam: "RHCE (EX294) — 1.1 automating with Ansible",
    source: "RH294 course material (Red Hat Enterprise Linux Administration III)",
    status: "written",
    sections: [
      {
        title: "Why automate, and what Ansible is",
        concepts: [
          {
            n: 1,
            title: "Why manual administration stops working",
            main: "One-server-at-a-time administration does not scale, and worse, it does not stay consistent.",
            simple: [
              "By hand, the tenth server gets configured slightly differently from the first — and nobody notices until something breaks.",
              "Automation removes that drift: the same playbook runs identically everywhere, and it is saved in a file you can review and version-control.",
              "It also gives you an audit trail: you can see exactly what was changed, because the change is written down."
            ],
            remember: "Manual work does not scale and silently drifts; automation is consistent, repeatable and auditable."
          },
          {
            n: 2,
            title: "Control node and managed nodes",
            main: "Ansible runs from one control node and applies changes to the managed nodes it targets.",
            simple: [
              "Think of a control tower and the aircraft it directs. You log in to one machine and tell it what should be true everywhere else.",
              "The control node does not need to be a server. Your own workstation is a perfectly normal place to run it from."
            ],
            parts: [
              ["control node", "the machine where you run ansible-playbook and where the automation lives."],
              ["managed node", "a target the playbook changes."],
              ["agentless", "no software installed on the managed node — it talks over SSH."]
            ],
            remember: "One control node drives many managed nodes, over SSH, with nothing installed on the targets."
          },
          {
            n: 3,
            title: "Ansible modules and idempotence",
            main: "A module is a small tool that does one job, and modules are written to be idempotent.",
            simple: [
              "Idempotent means: run it ten times and the result is the same as running it once. A module that sets a package to 'installed' does nothing if it is already installed.",
              "That is what makes a playbook safe to re-run — which matters enormously, because re-running is how you recover from a partial failure."
            ],
            parts: [
              ["module", "one specific job — install a package, copy a file, start a service."],
              ["idempotent", "running twice changes nothing the second time."],
              ["playbook", "a YAML file that strings modules together."],
              ["why it matters", "you can re-run a playbook safely at any time."]
            ],
            remember: "Modules do one job and are idempotent — running the same playbook twice is safe."
          }
        ]
      },
      {
        title: "Installing and the inventory",
        concepts: [
          {
            n: 4,
            title: "Installing Ansible",
            main: "Ansible comes from the AppStream repository and runs only on a Linux or UNIX control node.",
            simple: [
              "Windows is not supported as a control node — a genuine limitation worth knowing before you plan an architecture around it.",
              "It is in the repositories on a default RHEL install, so no extra repository setup is needed."
            ],
            example: ["sudo dnf install ansible", "ansible --version"],
            parts: [
              ["dnf install ansible", "install it from AppStream."],
              ["ansible --version", "confirm the version and which Python it is using."],
              ["Linux or UNIX only", "the control node cannot be Windows."],
              ["managed nodes", "must be able to be reached over SSH."]
            ],
            remember: "dnf install ansible from AppStream; the control node cannot be Windows."
          },
          {
            n: 5,
            title: "The static inventory",
            main: "The inventory is the list of machines Ansible knows about, usually grouped into named groups.",
            simple: [
              "A plain list of hostnames works for a small setup. Groups matter because they let one playbook target 'all webservers' rather than naming each one.",
              "The group name is what you write in the hosts: line."
            ],
            example: ["[webservers]", "servera", "serverb", "", "[dbservers]", "serverc", "", "[all:vars]", "ansible_user=student"],
            parts: [
              ["[groupname]", "a group header."],
              ["hostname", "one per line under it."],
              ["[all:vars]", "variables applied to every host."],
              ["[group:vars]", "variables applied to just that group."],
              ["alias.example.com", "Ansible can also refer to a host by IP if the name will not resolve."]
            ],
            remember: "The inventory is a list of hosts in named groups — the group name is what you target in a play."
          },
          {
            n: 6,
            title: "ansible.cfg search order",
            main: "Ansible uses the first ansible.cfg it finds, in a fixed order of precedence.",
            simple: [
              "When your settings seem to be ignored, it is usually because a different ansible.cfg is winning.",
              "The order is worth knowing precisely because it is a common exam question and a common real-world confusion."
            ],
            example: ["ansible --version | grep config", "export ANSIBLE_CONFIG=/path/to/ansible.cfg"],
            parts: [
              ["1. ANSIBLE_CONFIG env var", "highest — beats everything."],
              ["2. ./ansible.cfg", "in the directory you run from."],
              ["3. ~/.ansible.cfg", "your home directory."],
              ["4. /etc/ansible/ansible.cfg", "the system-wide default — lowest."],
              ["ansible --version", "shows which config file is actually in use."]
            ],
            remember: "ANSIBLE_CONFIG beats ./ansible.cfg, which beats ~/.ansible.cfg, which beats /etc/ansible/ansible.cfg."
          }
        ]
      },
      {
        title: "Ad hoc commands",
        concepts: [
          {
            n: 7,
            title: "Ad hoc commands",
            main: "An ad hoc command runs one module against some hosts, right now, without saving anything.",
            simple: [
              "The automation equivalent of typing a command by hand — but you can point it at fifty hosts at once.",
              "They are for one-off checks and quick actions. Anything you will do again belongs in a playbook."
            ],
            example: ["ansible all -m ping", "ansible webservers -m command -a 'uptime'", "ansible all -m dnf -a 'name=nginx state=present'"],
            parts: [
              ["ansible", "the ad hoc command tool."],
              ["all / groupname", "which hosts to target."],
              ["-m MODULE", "which module to run."],
              ["-a 'ARGS'", "the arguments to that module, in quotes."],
              ["-i FILE", "use a different inventory."],
              ["all", "every host in the inventory."]
            ],
            remember: "ansible <hosts> -m <module> -a 'args' — great for a one-off, wrong for anything repeatable."
          },
          {
            n: 8,
            title: "module versus module arguments",
            main: "The -m value is the module name; the -a value is the arguments, and the two are not interchangeable.",
            simple: [
              "A common mistake is putting the whole specification into -m. The module is just the tool's name; the arguments describe the job.",
              "For modules that need nothing beyond the host list — like ping — no -a is required at all."
            ],
            example: ["ansible all -m ping", "# wrong:", "ansible all -m 'ping -c 3'"],
            parts: [
              ["-m ping", "the module."],
              ["-a 'uptime'", "its arguments."],
              ["-a \"name=nginx state=present\"", "key=value pairs, space separated."]
            ],
            remember: "-m is the module name only; arguments go in -a as key=value pairs."
          }
        ]
      }
    ],
    revision: [
      ["Install", "dnf install ansible"],
      ["Check version and config", "ansible --version"],
      ["Inventory file", "[group]\\nhost  and  [all:vars]"],
      ["Ad hoc", "ansible TARGETS -m MODULE -a 'ARGS'"],
      ["Test connectivity", "ansible all -m ping"],
      ["Config precedence", "ANSIBLE_CONFIG > ./ansible.cfg > ~/.ansible.cfg > /etc/ansible/ansible.cfg"]
    ],
    inOneSentence: "One control node drives many managed nodes over SSH with nothing installed on them; the inventory is named groups; and ad hoc commands are for one-offs while anything repeatable becomes a playbook."
  },

  /* ================================ Part 2 — playbooks, variables, facts */
  {
    id: "rh294-02",
    book: "RH294",
    bookTitle: "Red Hat Enterprise Linux Administration III",
    n: 2,
    title: "Writing and Running Playbooks",
    partTitle: "Part 2 — playbooks, multiple plays, privilege, variables, Vault and facts",
    exam: "RHCE (EX294) — 2.1-2.4 implementing playbooks and variables",
    source: "RH294 course material (Red Hat Enterprise Linux Administration III)",
    status: "written",
    sections: [
      {
        title: "Playbook structure",
        concepts: [
          {
            n: 1,
            title: "The three levels",
            main: "A playbook contains plays, a play contains tasks, and a task calls a module.",
            simple: [
              "The nesting is strict and the indentation must match it, because YAML uses indentation to mean structure.",
              "Get the indentation wrong and you get a confusing error rather than an obvious one — so check the spaces before blaming the content."
            ],
            example: [
              "---",
              "- name: Configure web servers",
              "  hosts: webservers",
              "  tasks:",
              "    - name: Install nginx",
              "      ansible.builtin.dnf:",
              "        name: nginx",
              "        state: present"
            ],
            parts: [
              ["---", "optional YAML document start marker."],
              ["- name: (play)", "a play — one group of hosts with a set of tasks."],
              ["hosts:", "which hosts this play targets."],
              ["tasks:", "the tasks inside the play."],
              ["- name: (task)", "one task."],
              ["ansible.builtin.dnf:", "the module the task calls."]
            ],
            remember: "playbook > plays > tasks > module — and YAML indentation is what defines those levels."
          },
          {
            n: 2,
            title: "Running and checking a playbook",
            main: "ansible-playbook runs it; --syntax-check and --check let you find mistakes without changing anything.",
            simple: [
              "Checking first costs seconds and turns a half-applied change into a clean error message.",
              "--check is a dry run: it reports what it would do without touching the hosts."
            ],
            example: ["ansible-playbook site.yml", "ansible-playbook --syntax-check site.yml", "ansible-playbook --check site.yml", "ansible-playbook -i inventory site.yml", "ansible-playbook --limit webservers site.yml"],
            parts: [
              ["ansible-playbook FILE", "run the playbook."],
              ["--syntax-check", "parse and report YAML errors without running."],
              ["--check", "dry run — report changes without making them."],
              ["-i INVENTORY", "use a specific inventory."],
              ["--limit TARGET", "restrict to specific hosts or a group."],
              ["--start-at-task NAME", "resume from a named task."],
              ["-K", "prompt for the sudo password."]
            ],
            remember: "--syntax-check finds YAML errors; --check shows what would change without doing it."
          },
          {
            n: 3,
            title: "Multiple plays and privilege escalation",
            main: "One playbook can hold several plays targeting different groups, and each play can set its own become settings.",
            simple: [
              "This is what lets you configure a whole tier — load balancers, then web servers, then databases — in a single run, in the right order.",
              "become gives you a root shell for the tasks that need one, without making the whole playbook root."
            ],
            example: ["- name: Configure databases", "  hosts: dbservers", "  become: yes", "  become_method: sudo", "  tasks:", "    - name: Install postgresql-server", "      ansible.builtin.dnf:", "        name: postgresql-server", "        state: present"],
            parts: [
              ["become: yes", "run these tasks as root via sudo."],
              ["become_method", "sudo is the default; su is the alternative."],
              ["become_user", "escalate to a different user than the login user."],
              ["several plays", "each with its own hosts — they run in order."],
              ["ansible.builtin.", "the fully qualified module name; the short form also works."]
            ],
            remember: "Multiple plays run in order and each can set its own become: yes for the tasks that need root."
          }
        ]
      },
      {
        title: "Variables",
        concepts: [
          {
            n: 4,
            title: "Naming and precedence",
            main: "Variable names are strict, and several sources can define the same name — so precedence decides which wins.",
            simple: [
              "Precedence is how Ansible stays flexible: you can set a default in the playbook and override it per host when you need to.",
              "It is also how a playbook stops behaving the way you expect if something higher up is overriding you."
            ],
            parts: [
              ["name rules", "must start with a letter; letters, numbers and underscores only."],
              ["defaults", "lowest priority — values for everything."],
              ["playbook vars", "next."],
              ["inventory vars", "above playbook vars."],
              ["host_vars / group_vars", "per host or per group, above inventory."],
              ["extra vars (-e)", "highest — overrides everything, for one run."],
              ["role vars", "sit within the defaults-to-role band."]
            ],
            remember: "Defaults are lowest and -e extra vars are highest — extra vars beat everything."
          },
          {
            n: 5,
            title: "Precedence and registers",
            main: "register saves a task's output into a variable, so later tasks can use it.",
            simple: [
              "It is how you ask a question and then act on the answer — check whether something is true, and only then do the change.",
              "A registered variable is a dictionary, so you pull the interesting part out of it rather than using it directly."
            ],
            example: [
              "- name: Check if nginx is installed",
              "  ansible.builtin.command: rpm -q nginx",
              "  register: nginx_check",
              "  ignore_errors: yes",
              "",
              "- name: Install nginx if missing",
              "  ansible.builtin.dnf:",
              "    name: nginx",
              "    state: present",
              "  when: nginx_check.rc != 0"
            ],
            parts: [
              ["register: VAR", "capture this task's result into VAR."],
              ["VAR.rc", "the exit code — 0 is success."],
              ["VAR.stdout", "the captured standard output."],
              ["VAR.changed", "whether the task changed anything."],
              ["ignore_errors", "keep going instead of aborting when this task fails."]
            ],
            remember: "register captures a task's output; VAR.rc is the exit code and VAR.stdout the text."
          },
          {
            n: 6,
            title: "Ansible Vault",
            main: "Vault encrypts secrets inside a playbook or variables file so they can be stored safely.",
            simple: [
              "Passwords and API keys cannot live in a shared repository in plain text. Vault lets you keep them encrypted and still version-control the file.",
              "The encrypted string is one long blob beginning with $ANSIBLE_VAULT."
            ],
            example: ["ansible-vault create secrets.yml", "ansible-vault edit secrets.yml", "ansible-vault encrypt file.yml", "ansible-playbook --ask-vault-pass site.yml", "ansible-vault encrypt_string 'mypassword' --name 'db_password'"],
            parts: [
              ["create / edit", "make or change an encrypted file."],
              ["encrypt", "encrypt a plain file in place."],
              ["--ask-vault-pass", "supply the vault password at run time."],
              ["--vault-password-file FILE", "read the password from a file instead."],
              ["encrypt_string", "encrypt one value, for use inline in a playbook."],
              ["never commit the password", "the vault password is the only thing protecting the secrets."]
            ],
            remember: "Vault encrypts secrets so the file can be committed — but the vault password itself must never be committed."
          }
        ]
      },
      {
        title: "Facts",
        concepts: [
          {
            n: 7,
            title: "What facts are and why they matter",
            main: "Facts are variables Ansible discovers automatically about each managed host.",
            simple: [
              "Before it changes anything, Ansible asks each host to describe itself: its OS, kernel, memory, network interfaces, and whether it is a container.",
              "That is how one playbook can configure Ubuntu and RHEL correctly — it does not have to be told which is which."
            ],
            example: ["ansible all -m setup", "ansible_server.hostname", "ansible_distribution", "ansible_memtotal_mb", "ansible_default_ipv4.address"],
            parts: [
              ["ansible_distribution", "the OS family — RedHat, Debian, Ubuntu."],
              ["ansible_distribution_major_version", "the major version, e.g. 10."],
              ["ansible_hostname", "the host's name."],
              ["ansible_memtotal_mb", "total memory in MB."],
              ["ansible_default_ipv4.address", "the primary address."],
              ["gather_facts: no", "skip fact gathering when you do not need it — much faster."]
            ],
            remember: "Facts are auto-discovered facts about each host, and gather_facts: no skips the cost when you do not need them."
          },
          {
            n: 8,
            title: "Gathering facts faster",
            main: "Fact gathering is the slowest part of a short playbook, so turn it off when nothing uses the facts.",
            simple: [
              "For a playbook that only copies a file, asking every host to describe itself is pure overhead.",
              "This is a real optimisation, not a micro-detail: it is often the difference between a fast run and a slow one across many hosts."
            ],
            example: ["- name: Quick task", "  hosts: all", "  gather_facts: no", "  tasks:", "    - name: Copy file", "      ansible.builtin.copy:", "        src: file.txt", "        dest: /tmp/file.txt"],
            parts: [
              ["gather_facts: no", "at play level — skip gathering for this play."],
              ["setup module", "run manually if you need just some facts."],
              ["cacheable facts", "facts you tell Ansible to remember, speeding later runs."],
              ["setup_facts_gather", "set once in ansible.cfg to turn it off globally."]
            ],
            remember: "gather_facts: no at play level — worth it whenever no task uses a fact."
          }
        ]
      }
    ],
    revision: [
      ["Structure", "playbook > plays > tasks > module"],
      ["Run", "ansible-playbook FILE.yml"],
      ["Parse check", "--syntax-check"],
      ["Dry run", "--check"],
      ["Restrict hosts", "--limit webservers"],
      ["Escalate", "become: yes"],
      ["Capture output", "register: VAR   then   VAR.rc"],
      ["Extra vars (highest)", "-e 'key=value'"],
      ["Vault", "ansible-vault create/edit secrets.yml"],
      ["Skip facts", "gather_facts: no"]
    ],
    inOneSentence: "A playbook nests plays, tasks and modules; become: yes escalates per play; register captures output for later tasks; -e beats everything; and gather_facts: no skips needless work."
  },

  /* ============================ Part 3 — loops, conditionals, handlers, errors */
  {
    id: "rh294-03",
    book: "RH294",
    bookTitle: "Red Hat Enterprise Linux Administration III",
    n: 3,
    title: "Loops, Conditionals, Handlers and Failure Handling",
    partTitle: "Part 3 — iteration, conditions, reacting to change, and error control",
    exam: "RHCE (EX294) — 3.1-3.3 task control",
    source: "RH294 course material (Red Hat Enterprise Linux Administration III)",
    status: "written",
    sections: [
      {
        title: "Loops and conditionals",
        concepts: [
          {
            n: 1,
            title: "The loop keyword",
            main: "loop runs one task once for every item in a list, instead of repeating the task by hand.",
            simple: [
              "Same idea as the shell for loop: describe the work once and let Ansible repeat it.",
              "It is the difference between a five-line playbook and a fifty-line one."
            ],
            example: ["- name: Create users", "  ansible.builtin.user:", "    name: '{{ item }}'", "    state: present", "  loop:", "    - alice", "    - bob", "    - carol"],
            parts: [
              ["loop:", "a list — each item runs the task once."],
              ["loop: {{ some_list }}", "loop over a variable."],
              ["{{ item }}", "the current element; the name changes with loop_var."],
              ["loop_var", "rename item if you prefer something clearer."],
              ["with_items", "the older syntax — still works, but loop is current."]
            ],
            remember: "loop runs one task per list item; the element is {{ item }} unless you rename it."
          },
          {
            n: 2,
            title: "The when conditional",
            main: "when runs a task only if its condition is true.",
            simple: [
              "This is how a playbook adapts to what it finds — install the package only on the right OS family, copy the file only if it differs.",
              "Conditions can test variables, registered results, or facts."
            ],
            example: ["- name: Install httpd only on RHEL", "  ansible.builtin.dnf:", "    name: httpd", "    state: present", "  when: ansible_os_family == 'RedHat'"],
            parts: [
              ["when: CONDITION", "run only if true."],
              ["ansible_os_family", "test a fact."],
              ["VAR.rc == 0", "test a registered result."],
              ["when: item ...", "test the current loop item."],
              ["- name: ..." , "a bare dash means the condition failed and the task was skipped."]
            ],
            remember: "when: gates a task on a condition; a skipped task is shown with a dash, not reported as a failure."
          },
          {
            n: 3,
            title: "Multiple conditions and complex tests",
            main: "Conditions combine with and, or, not — and grouping parentheses around them.",
            simple: [
              "Read it as you would a sentence: 'this and that, or the other thing'.",
              "Without the parentheses, and binds tighter than or and you get a different meaning than you intended."
            ],
            example: ["when:", "  - ansible_os_family == 'RedHat'", "  - item.state == 'started'", "when: (a == 1 or b == 2) and not c"],
            parts: [
              ["list form", "several conditions, all must be true (AND)."],
              ["or / not", "available inside a single expression."],
              ["parentheses", "group explicitly when mixing and with or."],
              ["{{ }} is optional here", "Jinja syntax is implied in when."]
            ],
            remember: "A list of conditions is AND; use and/or/not with parentheses when you need grouping."
          }
        ]
      },
      {
        title: "Handlers",
        concepts: [
          {
            n: 4,
            title: "What a handler does",
            main: "A handler is a task that runs only when a task before it reported a change.",
            simple: [
              "The pattern is: update a config file, then restart the service — but only if the file actually changed.",
              "Running the restart unconditionally wastes time on every host that did not change, and briefly drops service for no reason."
            ],
            example: ["- name: Deploy nginx config", "  ansible.builtin.template:", "    src: nginx.conf.j2", "    dest: /etc/nginx/nginx.conf", "  notify: Restart nginx", "", "handlers:", "  - name: Restart nginx", "    ansible.builtin.service:", "      name: nginx", "      state: restarted"],
            parts: [
              ["notify: HANDLER", "call a handler if this task reports changed."],
              ["handlers:", "a section at play or playbook level."],
              ["only on change", "a handler that is notified but not needed does nothing."],
              ["listeners", "several handlers can share one notify name."],
              ["order", "handlers run at the END of the play, not immediately."]
            ],
            remember: "notify: calls a handler, which runs only on change — and at the end of the play, not straight away."
          }
        ]
      },
      {
        title: "Handling failure",
        concepts: [
          {
            n: 5,
            title: "What happens when a task fails",
            main: "By default a failed task aborts the remaining tasks for that host — but not for other hosts.",
            simple: [
              "Each host is independent. If one of fifty servers fails a task, the other forty-nine carry on. That is usually what you want.",
              "This is worth understanding because it means a partial run is normal, and re-running is safe."
            ],
            parts: [
              ["failed on this host", "later tasks for that host are skipped."],
              ["other hosts", "unaffected and continue."],
              ["ignore_errors: yes", "keep going on this host despite the failure."],
              ["failed_when", "decide yourself what counts as a failure."],
              ["changed_when: false", "report the task as ok even if it technically ran a command."]
            ],
            remember: "A failure stops tasks for THAT host only; other hosts carry on."
          },
          {
            n: 6,
            title: "ignore_errors, failed_when and failed_when conditions",
            main: "ignore_errors swallows a failure; failed_when changes what counts as a failure.",
            simple: [
              "These are different tools for different situations, and confusing them causes real problems.",
              "ignore_errors hides a genuine problem as much as it lets you continue. Use it when a failure genuinely does not matter.",
              "failed_when lets a command that exits non-zero be treated as fine when you know the exit code is not a problem."
            ],
            example: ["- name: Check disk space", "  ansible.builtin.command: df /", "  register: disk", "  ignore_errors: yes", "", "- name: Command that may exit non-zero harmlessly", "  ansible.builtin.command: grep -q pattern /file", "  changed_when: false", "  failed_when: false"],
            parts: [
              ["ignore_errors: yes", "carry on past a failure — it is still reported as failed."],
              ["failed_when: CONDITION", "treat as failed only if your own condition holds."],
              ["failed_when: false", "never fail this task, whatever the exit code."],
              ["changed_when: false", "suppress the 'changed' report when nothing really changed."],
              ["check mode", "add check_mode: false to let a task run under --check."]
            ],
            remember: "ignore_errors continues past a failure; failed_when decides what counts as one; changed_when controls the 'changed' report."
          }
        ]
      }
    ],
    revision: [
      ["Iterate", "loop:  with  {{ item }}"],
      ["Rename the item", "loop_var: NAME"],
      ["Gate a task", "when: CONDITION"],
      ["Several conditions (AND)", "a list under when:"],
      ["React to change", "notify: HANDLER"],
      ["Declare handlers", "handlers: section"],
      ["Carry on past failure", "ignore_errors: yes"],
      ["Define failure yourself", "failed_when: false"],
      ["Suppress changed report", "changed_when: false"]
    ],
    inOneSentence: "loop repeats a task per item and when gates it on a condition; notify triggers a handler only when something actually changed; and a failure stops only that host."
  },

  /* ================== Part 4 — files modules and Jinja2 templates */
  {
    id: "rh294-04",
    book: "RH294",
    bookTitle: "Red Hat Enterprise Linux Administration III",
    n: 4,
    title: "Managing Files and Jinja2 Templates",
    partTitle: "Part 4 — file modules, templates, loops in templates, filters and tests",
    exam: "RHCE (EX294) — 4.1-4.2 managing files and using templates",
    source: "RH294 course material (Red Hat Enterprise Linux Administration III)",
    status: "written",
    sections: [
      {
        title: "The file modules",
        concepts: [
          {
            n: 1,
            title: "Choosing the right file module",
            main: "Different modules handle different file needs — copying content, writing content, or only managing attributes.",
            simple: [
              "Reaching for the wrong one causes surprising behaviour: copy fails on a remote source, blockinfile duplicates entries, and lineinfile replaces the whole file."
            ],
            example: ["- name: Copy a file", "  ansible.builtin.copy:", "    src: file.txt", "    dest: /etc/file.txt", "", "- name: Write content", "  ansible.builtin.copy:", "    content: 'literal text here'", "    dest: /etc/file.txt", "", "- name: Ensure a line exists", "  ansible.builtin.lineinfile:", "    path: /etc/motd", "    line: 'Welcome'", "    state: present"],
            parts: [
              ["copy", "copy a file from the control node — src must be local."],
              ["copy with content", "write literal text instead of a file."],
              ["template", "render a Jinja2 template from the control node."],
              ["file", "create/delete/touch, and manage mode, owner, SELinux context."],
              ["lineinfile", "ensure one specific line exists."],
              ["blockinfile", "insert a marked block, replacing it if present."],
              ["fetch / slurp", "get a file FROM the managed node."]
            ],
            remember: "copy and template move files from the control node; file manages attributes; lineinfile and blockinfile edit in place."
          },
          {
            n: 2,
            title: "The file module for attributes only",
            main: "The file module changes permissions, ownership and SELinux context without touching content.",
            simple: [
              "When a task's only job is to make a file's permissions correct, do not copy the file again — use the file module.",
              "This is also the safe way to recursively fix a whole tree's ownership."
            ],
            example: ["- name: Set permissions and ownership", "  ansible.builtin.file:", "    path: /var/www/html", "    state: directory", "    owner: apache", "    group: apache", "    mode: '0755'"],
            parts: [
              ["state: directory", "ensure it is a directory."],
              ["state: touch", "create it, or update its timestamp if it exists."],
              ["state: absent", "delete it — idempotent."],
              ["state: link", "create a symbolic link."],
              ["mode", "permissions, best in quotes — 0755 can be read as octal."],
              ["owner / group", "who owns it."],
              ["- recurse: yes", "apply to everything beneath."]
            ],
            remember: "state: absent for deletion, touch to create, and always quote mode so it stays octal."
          }
        ]
      },
      {
        title: "Jinja2 templates",
        concepts: [
          {
            n: 3,
            title: "What a template does",
            main: "A template is a source file with placeholders that Ansible fills in per host at deploy time.",
            simple: [
              "One config file works everywhere because the parts that differ — hostnames, addresses, versions — are substituted from that host's own facts and variables.",
              "Without this you would need one config file per server, and they would drift apart immediately."
            ],
            example: ["# nginx.conf.j2", "server_name {{ inventory_hostname }};", "listen {{ ansible_nginx_port | default(80) }};", "{% if enable_ssl %}", "ssl_certificate /etc/pki/{{ inventory_hostname }}.crt;", "{% endif %}"],
            parts: [
              ["{{ VARIABLE }}", "output a value."],
              ["{% %}", "a statement — a loop or a condition."],
              ["{# #}", "a comment that never reaches the output."],
              ["ansible.builtin.template:", "the module that renders it."],
              ["jinja2 file extension", "by convention, e.g. nginx.conf.j2"]
            ],
            remember: "{{ }} outputs a value, {% %} runs a statement, and {# #} is a template-only comment."
          },
          {
            n: 4,
            title: "Loops and conditionals inside templates",
            main: "Jinja2 supports for-loops and if-statements, with their own end tags.",
            simple: [
              "This is how one template produces a config containing a different number of entries depending on the host — servers, aliases, backends.",
              "Every opening block needs a matching end, or the render fails with a confusing error."
            ],
            example: ["{% for host in group['webservers'] %}", "upstream backend {", "  server {{ host }}:8080;", "}", "{% endfor %}", "", "{% if enable_gzip %}", "gzip on;", "{% endif %}"],
            parts: [
              ["{% for X in Y %}", "start a loop."],
              ["{% endfor %}", "close it."],
              ["{% if COND %}", "start a condition."],
              ["{% endif %}", "close it."],
              ["{% else %}", "the alternative branch."],
              ["group['name']", "a host group from the inventory, as a list."]
            ],
            remember: "{% for %}...{% endfor %} and {% if %}...{% endif %} — every opening block needs its end tag."
          },
          {
            n: 5,
            title: "Filters and tests",
            main: "A filter transforms a value's output; a test asks a yes/no question about it.",
            simple: [
              "Filters are like formatting — they change how a value appears without changing what it is.",
              "Tests are different: they return true or false, and you use them inside a condition."
            ],
            example: ["{{ name | upper }}", "{{ list | join(', ') }}", "{{ value | default('fallback') }}", "{{ name | b64encode }}", "{% if var is defined %}   {% if var is number %}"],
            parts: [
              ["| filter", "pipe a value through a transformation."],
              ["upper / lower", "change case."],
              ["join(', ')", "turn a list into a string."],
              ["default('x')", "use x if the value is undefined or empty."],
              ["b64encode / b64decode", "Base64 conversion."],
              ["b64encode + type=b64", "mark content as already-encoded."],
              ["is defined / is number", "tests — return true or false."]
            ],
            remember: "A filter transforms (| upper); a test asks a question (is defined) and returns true or false."
          }
        ]
      }
    ],
    revision: [
      ["Copy / write / fetch", "copy (src or content)  /  fetch  /  slurp"],
      ["Edit in place", "lineinfile (one line)  /  blockinfile (marked block)"],
      ["Attributes only", "file module: state, mode, owner, recurse"],
      ["Render a template", "template: with a .j2 source"],
      ["Template syntax", "{{ value }}   {% statement %}   {# comment #}"],
      ["Loop in template", "{% for x in y %}...{% endfor %}"],
      ["Condition in template", "{% if c %}...{% endif %}"],
      ["Filters vs tests", "| upper  /  is defined"]
    ],
    inOneSentence: "Pick the file module that matches the job; templates fill in per-host values; {% %} blocks need their end tags; and filters transform values while tests return true or false."
  },

  /* ============== Part 5 — host patterns, dynamic inventory, parallelism */
  {
    id: "rh294-05",
    book: "RH294",
    bookTitle: "Red Hat Enterprise Linux Administration III",
    n: 5,
    title: "Host Patterns, Dynamic Inventories and File Organisation",
    partTitle: "Part 5 — targeting hosts, dynamic inventory, forks, and include versus import",
    exam: "RHCE (EX294) — 5.1-5.4 inventory management and playbook organisation",
    source: "RH294 course material (Red Hat Enterprise Linux Administration III)",
    status: "written",
    sections: [
      {
        title: "Host patterns",
        concepts: [
          {
            n: 1,
            title: "The hosts: line is a pattern language",
            main: "hosts: accepts far more than one group name — it is a full pattern language.",
            simple: [
              "Once you know the patterns you can express 'every web server except the one being rebuilt' in a single line.",
              "This is what keeps playbooks readable instead of full of hand-written host lists."
            ],
            example: ["hosts: webservers", "hosts: webservers:&staging", "hosts: webservers:!servera", "hosts: all:!db1:!db2", "hosts: web*"],
            parts: [
              ["group", "a plain group name."],
              ["all", "every host in the inventory."],
              ["group:&other", "hosts in BOTH groups (intersection)."],
              ["group:!other", "hosts in the group EXCEPT those in other (difference)."],
              ["group:*", "all children of a group."],
              ["web*", "a wildcard on names."]
            ],
            remember: "hosts: uses a pattern language: & intersection, ! difference, * wildcard."
          }
        ]
      },
      {
        title: "Dynamic inventory",
        concepts: [
          {
            n: 2,
            title: "Why the inventory moves",
            main: "A static file breaks down when machines are created and destroyed automatically — which is exactly how cloud works.",
            simple: [
              "If your servers come and go from a cloud provider, asking the cloud what exists right now is always correct and a typed file never is.",
              "A dynamic inventory is a script that produces the inventory on demand."
            ],
            example: ["ansible-inventory -i aws_ec2.yml --graph", "chmod +x ./my_cloud_inventory.py"],
            parts: [
              ["static inventory", "a file you maintain by hand."],
              ["dynamic inventory", "a script that returns the host list."],
              ["ansible-inventory --graph", "show what Ansible actually resolved — the best debugging tool here."],
              ["executable script", "output plain JSON or YAML and it is used directly."],
              ["plugins", "cloud providers ship as plugins needing no script of your own."]
            ],
            remember: "Dynamic inventory asks the environment what exists now; ansible-inventory --graph shows what Ansible actually resolved."
          }
        ]
      },
      {
        title: "Parallelism",
        concepts: [
          {
            n: 3,
            title: "The forks setting",
            main: "Forks controls how many managed hosts Ansible talks to at the same time.",
            simple: [
              "By default it is five. Raise it and a run across fifty machines finishes much faster — until you overload the control node or the target API.",
              "It is a balance, and the limit is usually the control node's own capacity."
            ],
            example: ["ansible-playbook -f 20 site.yml", "ansible -f 10 all -m ping", "[defaults]\nforks = 20"],
            parts: [
              ["-f N / --forks N", "set parallelism for a run."],
              ["forks in ansible.cfg", "set it permanently."],
              ["default", "5 concurrent hosts."],
              ["raising it", "faster, but can overload the control node or an API."],
              ["serial", "a different limit — process only this many hosts before moving on."]
            ],
            remember: "Forks default to 5; raise with -f to speed up large runs, within what your control node can handle."
          }
        ]
      },
      {
        title: "Include versus import",
        concepts: [
          {
            n: 4,
            title: "The difference that matters",
            main: "import_* is processed when the playbook is parsed; include_* is processed when the play runs.",
            simple: [
              "Everything inside an imported file is known up front, so loops and conditionals around the import control whether it is loaded at all.",
              "Included content is loaded as the play runs, so it can be used with tags, and each include may be evaluated separately."
            ],
            example: ["- import_playbook: other.yml    # parsed now, must exist", "- include_tasks: common.yml     # loaded at run time, can be conditional", "tasks:\n  - include_tasks: site.yml\n    tags: [web]"],
            parts: [
              ["import_playbook", "another playbook, parsed at parse time."],
              ["import_tasks / import_role", "tasks or a role, parsed at parse time."],
              ["include_tasks / include_role", "loaded at run time — works with tags and dynamic loops."],
              ["import_playbook cannot loop", "it is not a task, so it cannot take a loop."],
              ["tags", "a key reason to use include rather than import."]
            ],
            remember: "import is parsed up front and must exist; include is loaded at run time, which is why it works with tags and loops."
          },
          {
            n: 5,
            title: "Structuring a growing project",
            main: "As a playbook grows, split it into a directory with inventories, roles and group variables.",
            simple: [
              "Keep each playbook focused on one concern and put shared setup in group_vars so it is not repeated.",
              "The goal is that a new host is added by adding a line to an inventory, not by editing playbooks."
            ],
            example: ["project/", "  inventory/", "    production.ini", "  group_vars/", "    webservers.yml", "  site.yml", "  roles/", "  templates/"],
            parts: [
              ["inventory/", "environments kept apart."],
              ["group_vars/FILE.yml", "variables for a group, loaded automatically."],
              ["host_vars/FILE.yml", "variables for one host, loaded automatically."],
              ["roles/", "reusable bundles."],
              ["one playbook per concern", "rather than one giant playbook."]
            ],
            remember: "group_vars and host_vars load automatically by filename — that is how you avoid editing playbooks to add a host."
          }
        ]
      }
    ],
    revision: [
      ["Intersect groups", "hosts: webservers:&staging"],
      ["Exclude", "hosts: webservers:!servera"],
      ["All except some", "hosts: all:!db1:!db2"],
      ["See the resolved inventory", "ansible-inventory -i FILE --graph"],
      ["Parallelism", "-f 20  or  forks in ansible.cfg"],
      ["Static include", "import_playbook / import_tasks / import_role"],
      ["Dynamic include", "include_playbook / include_tasks / include_role"],
      ["Auto-loaded variables", "group_vars/NAME.yml and host_vars/NAME.yml"]
    ],
    inOneSentence: "hosts: is a pattern language using & ! and *; a dynamic inventory asks the environment what exists; forks defaults to 5; and import is parsed up front while include is loaded at run time."
  },

  /* ============================== Part 6 — roles and Ansible Galaxy */
  {
    id: "rh294-06",
    book: "RH294",
    bookTitle: "Red Hat Enterprise Linux Administration III",
    n: 6,
    title: "Roles and Reusable Content",
    partTitle: "Part 6 — role structure, RHEL System Roles, writing your own, and Galaxy",
    exam: "RHCE (EX294) — 6.1-6.2 using Ansible roles",
    source: "RH294 course material (Red Hat Enterprise Linux Administration III)",
    status: "written",
    sections: [
      {
        title: "Role structure",
        concepts: [
          {
            n: 1,
            title: "What a role is",
            main: "A role is a standard directory layout that bundles everything one piece of functionality needs.",
            simple: [
              "Think of it as a box that already has labelled compartments: tasks in one, templates in another, defaults in a third.",
              "Because the layout is standardised, Ansible finds everything without you telling it where anything is."
            ],
            example: ["roles/", "  nginx/", "    defaults/main.yml", "    tasks/main.yml", "    templates/nginx.conf.j2", "    handlers/main.yml", "    meta/main.yml"],
            parts: [
              ["tasks/main.yml", "what the role does — required."],
              ["defaults/main.yml", "default variable values, lowest precedence."],
              ["vars/main.yml", "variables that override anything — use sparingly."],
              ["templates/", "template files."],
              ["handlers/main.yml", "handlers the role may notify."],
              ["files/", "static files to copy in."],
              ["meta/main.yml", "dependencies."],
              ["roles/", "nested roles inside a role."]
            ],
            remember: "tasks/main.yml is required; defaults are lowest precedence; templates, handlers, files and meta are the other standard folders."
          },
          {
            n: 2,
            title: "The directory search path",
            main: "Ansible looks for a role in several places, in a fixed order.",
            simple: [
              "This is why the same role name behaves consistently regardless of where you run the playbook from.",
              "Knowing the order explains why one copy is being used and not the other."
            ],
            example: ["- hosts: all", "  roles:", "    - role: nginx", "      tags: [web]"],
            parts: [
              ["roles/ relative to the playbook", "the usual location."],
              ["/etc/ansible/roles", "system-wide."],
              ["~/.ansible/roles", "per user."],
              ["/usr/share/ansible/roles", "shipped with packages — where RHEL System Roles live."],
              ["galaxy.roles_path", "where downloaded roles are placed."]
            ],
            remember: "Role search order: playbook's roles/, /etc/ansible/roles, ~/.ansible/roles, then /usr/share/ansible/roles."
          }
        ]
      },
      {
        title: "RHEL System Roles",
        concepts: [
          {
            n: 3,
            title: "What they are",
            main: "RHEL System Roles are Red Hat-provided and Red Hat-SUPPORTED roles for common subsystems.",
            simple: [
              "They exist so you do not have to write a role for SELinux, firewall, Apache or storage yourself.",
              "The supported part matters: if one breaks, Red Hat is accountable for it. A community role from Galaxy is not."
            ],
            example: ["sudo dnf install ansible-role-redhat-selinux", "sudo dnf install ansible-role-redhat-firewall", "sudo dnf install ansible-role-redhat-apache", "sudo dnf install ansible-role-redhat-postgresql"],
            parts: [
              ["ansible-role-redhat-*", "packaged as ordinary RPMs — installed with dnf."],
              ["selinux / firewall / apache / postgresql", "among the available subsystems."],
              ["Red Hat-supported", "accountable through your subscription."],
              ["no Galaxy needed", "they come from the official repositories."]
            ],
            remember: "RHEL System Roles are packaged as ansible-role-redhat-* RPMs — dnf install, no Galaxy required."
          }
        ]
      },
      {
        title: "Creating roles and using Galaxy",
        concepts: [
          {
            n: 4,
            title: "Scaffolding and using your own role",
            main: "ansible-galaxy init builds the standard skeleton, and you then fill in the tasks.",
            simple: [
              "The command creates every folder Ansible expects, so you are not guessing the layout.",
              "Then reference the role by name in a play — or in a roles/ directory beside your playbook."
            ],
            example: ["ansible-galaxy init roles/nginx", "ansible-playbook site.yml"],
            parts: [
              ["ansible-galaxy init PATH", "create the standard skeleton."],
              ["fill in tasks/main.yml", "what it actually does."],
              ["defaults/main.yml", "variables the caller can override."],
              ["- role: nginx", "use it in a play's roles: section."]
            ],
            remember: "ansible-galaxy init builds the skeleton; then reference the role by name in the roles: section."
          },
          {
            n: 5,
            title: "Ansible Galaxy",
            main: "Galaxy is a public hub of community-contributed roles, installable by name.",
            simple: [
              "It saves writing something that already exists. But community roles carry no Red Hat support and you are trusting a stranger's code.",
              "Read a role before you run it in production — it is code from the internet."
            ],
            example: ["ansible-galaxy search nginx", "ansible-galaxy install geerlingguy.nginx", "ansible-galaxy list", "ansible-galaxy remove geerlingguy.nginx"],
            parts: [
              ["search", "find roles by keyword."],
              ["install NAMESPACE.ROLE", "download and install a role."],
              ["list", "what is currently installed."],
              ["remove", "uninstall one."],
              ["ansible.cfg", "roles_path controls where they are installed."],
              ["no support contract", "community code — review before running it."]
            ],
            remember: "Galaxy saves writing roles that exist, but they are community code with no Red Hat support — read before you trust it."
          }
        ]
      }
    ],
    revision: [
      ["Role skeleton", "ansible-galaxy init roles/NAME"],
      ["Required file", "tasks/main.yml"],
      ["Defaults (lowest precedence)", "defaults/main.yml"],
      ["Search path", "playbook roles/ > /etc/ansible/roles > ~/.ansible/roles > /usr/share/ansible/roles"],
      ["Install a system role", "dnf install ansible-role-redhat-selinux"],
      ["Find a Galaxy role", "ansible-galaxy search TERM"],
      ["Install / list / remove", "ansible-galaxy install NAMESPACE.ROLE / list / remove"]
    ],
    inOneSentence: "A role is a standard folder layout with tasks, defaults, templates and handlers; RHEL System Roles are supported RPMs you install with dnf; and Galaxy roles are community code worth reading first."
  },

  /* ================================================ Part 7 — troubleshooting */
  {
    id: "rh294-07",
    book: "RH294",
    bookTitle: "Red Hat Enterprise Linux Administration III",
    n: 7,
    title: "Troubleshooting Playbooks and Managed Hosts",
    partTitle: "Part 7 — logging playbook output, debugging, and fixing managed nodes",
    exam: "RHCE (EX294) — 7.1-7.2 troubleshooting and validating playbooks",
    source: "RH294 course material (Red Hat Enterprise Linux Administration III)",
    status: "written",
    sections: [
      {
        title: "Troubleshooting playbooks",
        concepts: [
          {
            n: 1,
            title: "Ansible logs nothing by default",
            main: "Without configuration, Ansible's output goes only to the terminal and is never written to a file.",
            simple: [
              "So when a run fails at 2am, there is nothing to look back at. Turning on logging first is what makes any future failure investigable."
            ],
            example: ["export ANSIBLE_LOG_PATH=/var/log/ansible.log", "export ANSIBLE_DEBUG=1", "ansible-playbook site.yml 4> debug.log"],
            parts: [
              ["ANSIBLE_LOG_PATH", "where the log file is written."],
              ["ANSIBLE_DEBUG", "very verbose — includes module arguments and results."],
              ["4> debug.log", "capture stderr, where the detail lives."],
              ["-vv / -vvv / -vvvv", "increase verbosity on the command line."],
              ["warning", "ANSIBLE_DEBUG is very noisy — use it when something is genuinely wrong."]
            ],
            remember: "Nothing is logged unless you set ANSIBLE_LOG_PATH; use -v to -vvvv to raise verbosity."
          },
          {
            n: 2,
            title: "Syntax check, check mode and diff",
            main: "Three separate levels of safety exist before you let a playbook change anything.",
            simple: [
              "--syntax-check parses without running. --check runs the logic but makes no changes. --diff shows exactly what would change.",
              "Use all three before a first run against anything important."
            ],
            example: ["ansible-playbook --syntax-check site.yml", "ansible-playbook --check --diff site.yml"],
            parts: [
              ["--syntax-check", "YAML and structure errors only. Instant."],
              ["--check", "runs modules in check mode — no changes made."],
              ["--diff", "show the before/after diff for changed files."],
              ["--check --diff", "the safest way to preview a run."],
              ["check_mode: false on a task", "opt a specific task out so it really runs."]
            ],
            remember: "--syntax-check parses, --check changes nothing, --diff shows what would change."
          },
          {
            n: 3,
            title: "Reading the recap line",
            main: "The recap at the end tells you exactly what happened across every host.",
            simple: [
              "ok is unchanged, changed is a modification, unreachable is a connectivity problem, failed is a task that errored.",
              "When a run does not do what you expected, this line is usually where the answer is."
            ],
            example: ["PLAY RECAP ***********", "servera  : ok=12  changed=3  unreachable=0  failed=1"],
            parts: [
              ["ok", "tasks that succeeded with no change."],
              ["changed", "tasks that actually modified something."],
              ["unreachable", "could not connect — SSH or connectivity problem."],
              ["failed", "a task errored."],
              ["skipped", "a when: condition was false."]
            ],
            remember: "The PLAY RECAP tells you ok, changed, unreachable, failed and skipped per host — read it first."
          }
        ]
      },
      {
        title: "Troubleshooting managed nodes",
        concepts: [
          {
            n: 4,
            title: "Modules that ignore check mode",
            main: "command, shell and script always run, even under --check.",
            simple: [
              "Ansible cannot know what a raw command will do, so it runs it. That means a --check run can still change things — which defeats the point.",
              "Use changed_when: false and failed_when: false to control how those are reported."
            ],
            example: ["- name: Run a command safely", "  ansible.builtin.command: systemctl status nginx", "  changed_when: false", "  failed_when: false"],
            parts: [
              ["command", "runs even under --check."],
              ["shell / script", "also run under --check."],
              ["changed_when: false", "report as unchanged."],
              ["failed_when: false", "report as ok."],
              ["check_mode: false", "the opposite — force a task to skip in check mode."]
            ],
            remember: "command, shell and script run even under --check — pair them with changed_when and failed_when.",
            warning: "A --check run is not always harmless. command, shell and script still execute, so anything that changes state can still change it."
          },
          {
            n: 5,
            title: "The unreachable problem",
            main: "When Ansible cannot reach a host, almost every cause is SSH or credentials.",
            simple: [
              "Work through it in order: can you ssh in by hand? Does the key exist with correct permissions? Is the inventory right? Is it a first-boot prompt?",
              "ansible -m ping is the fastest way to isolate connectivity from playbook problems."
            ],
            example: ["ansible all -m ping", "ssh -vvv student@servera", "ansible all -m ping -vvv"],
            parts: [
              ["ansible all -m ping", "the first thing to run — isolates connectivity."],
              ["ssh by hand", "if that fails, it is not an Ansible problem."],
              ["first boot prompt", "SSH refuses until the host key is accepted — visible as a timeout."],
              ["wrong key", "specify ansible_ssh_private_key_file in inventory vars."],
              ["sudo password", "-K prompts once instead of per host."],
              ["user unknown", "the remote account is missing or locked."]
            ],
            remember: "Start with ansible -m ping — if plain ssh fails too, it is never an Ansible problem.",
            warning: "An unreachable host after a fresh install is usually SSH waiting on a first-connection host key prompt."
          },
          {
            n: 6,
            title: "Module failure versus task failure",
            main: "A module can fail because the software is missing, the package name is wrong, or the service is not installed yet.",
            simple: [
              "The error text usually says which. Read it before changing the playbook — often the module is right and the machine is not ready.",
              "Ordering tasks so a package is installed before it is configured prevents most of this."
            ],
            example: ["- name: Ensure firewalld is installed", "  ansible.builtin.dnf:", "    name: firewalld", "    state: present", "  become: yes", "", "- name: Now configure it", "  ansible.builtin.firewalld: ..."],
            parts: [
              ["module not found", "the named module does not exist — check the spelling."],
              ["service not installed", "configure before installing. Reorder the tasks."],
              ["package name wrong", "the error usually names what was not found."],
              ["permissions", "a task needs become: yes."],
              ["ordering", "most failures of this kind are just tasks in the wrong order."]
            ],
            remember: "Module failure is often the machine not being ready, not the module being wrong — install before you configure."
          }
        ]
      }
    ],
    revision: [
      ["Enable logging", "export ANSIBLE_LOG_PATH=/var/log/ansible.log"],
      ["Raise verbosity", "-v  -vv  -vvv  -vvvv"],
      ["Parse check", "--syntax-check"],
      ["Preview", "--check --diff"],
      ["Read the result", "the PLAY RECAP line"],
      ["Safe raw commands", "changed_when: false  failed_when: false"],
      ["Isolate connectivity", "ansible all -m ping"],
      ["Supply a password", "-K"]
    ],
    inOneSentence: "Nothing is logged until you set ANSIBLE_LOG_PATH; --syntax-check, --check and --diff are your three safety levels; and an unreachable host is almost always SSH rather than Ansible."
  },

  /* ====================== Part 8 — automating core RHEL administration */
  {
    id: "rh294-08",
    book: "RH294",
    bookTitle: "Red Hat Enterprise Linux Administration III",
    n: 8,
    title: "Automating Core Administration",
    partTitle: "Part 8 — packages, users, scheduling, storage and networking, all as modules",
    exam: "RHCE (EX294) — 8.1-8.4 automating administration",
    source: "RH294 course material (Red Hat Enterprise Linux Administration III)",
    status: "written",
    sections: [
      {
        title: "Software, users and scheduling",
        concepts: [
          {
            n: 1,
            title: "Managing software",
            main: "The package module makes package management declarative rather than a sequence of commands.",
            simple: [
              "Instead of 'install it and hope', you state the desired state and Ansible works out whether anything needs doing.",
              "That is what makes it idempotent — and why re-running is safe."
            ],
            example: ["- name: Install httpd", "  ansible.builtin.dnf:", "    name: httpd", "    state: present", "    enable: true"],
            parts: [
              ["state: present", "installed if not already there."],
              ["state: latest", "also upgraded to the newest available."],
              ["state: absent", "removed if present."],
              ["enable: true", "also start it at boot."],
              ["update_cache", "refresh the metadata first."]
            ],
            remember: "dnf module: state present installs, latest also upgrades, absent removes."
          },
          {
            n: 2,
            title: "Managing users",
            main: "The user and group modules declare accounts and memberships declaratively.",
            simple: [
              "Append to a group rather than replace, so the module does not silently strip the memberships you did not mention — the usermod -a trap in module form."
            ],
            example: ["- name: Create a user", "  ansible.builtin.user:", "    name: developer", "    groups: developers, docker", "    append: yes", "    shell: /bin/bash", "    create_home: yes"],
            parts: [
              ["name", "the account to create."],
              ["groups", "supplementary groups."],
              ["append: yes", "ADD to groups, not replace them."],
              ["shell", "the login shell."],
              ["create_home", "create the home directory."],
              ["password / password_hash", "set it — prefer password_hash with a hash."],
              ["ansible.builtin.group", "create and manage groups too."]
            ],
            remember: "append: yes adds to supplementary groups instead of replacing them.",
            warning: "Without append: yes, specifying groups replaces the account's existing supplementary groups."
          },
          {
            n: 3,
            title: "Scheduling with modules",
            main: "The at and cron modules automate one-time and recurring scheduling.",
            simple: [
              "The RHEL 8-era shell wrappers like at and cron are available as modules, so the same thing you did by hand in RH134 now becomes a task.",
              "This is the practical payoff of having learned the commands first."
            ],
            example: ["- name: Remove a user in five minutes", "  ansible.builtin.at:", "    command: userdel -r tempuser", "    state: present", "    minutes: 5", "", "- name: Daily backup", "  ansible.builtin.cron:", "    name: nightly backup", "    minute: '0'", "    hour: '2'", "    job: '/usr/local/bin/backup'"],
            parts: [
              ["at module", "one-time jobs — minutes, hours, days."],
              ["cron module", "recurring jobs — minute, hour, day, month, weekday, job."],
              ["job", "the command to run."],
              ["state: absent", "remove the job."],
              ["special time entries", "reboot, yearly, hourly, daily — same names as in a crontab."]
            ],
            remember: "The at module does one-time jobs and cron does recurring ones — same concepts as RH134, now declarative."
          }
        ]
      },
      {
        title: "Storage and networking",
        concepts: [
          {
            n: 4,
            title: "Managing storage",
            main: "The storage stack — partition, PV, VG, LV, filesystem, mount — maps onto modules one for one.",
            simple: [
              "What you learned as a manual order in RH134 becomes a list of tasks in the same order.",
              "The ordering matters just as much: a filesystem task before its volume exists will fail."
            ],
            example: ["- name: Create the volume group", "  community.general.lvg:", "    vg: vg0", "    pvs: /dev/sdb1", "", "- name: Create the logical volume", "  community.general.lvol:", "    vg: vg0", "    name: data", "    size: 20G", "", "- name: Format and mount", "  ansible.builtin.filesystem:", "    fstype: xfs", "    dev: /dev/vg0/data", "  ansible.posix.mount:", "    path: /mnt/data", "    src: /dev/vg0/data", "    fstype: xfs", "    state: mounted"],
            parts: [
              ["community.general.lvg", "create a volume group."],
              ["community.general.lvol", "create a logical volume."],
              ["ansible.builtin.filesystem", "create a filesystem on a device."],
              ["ansible.posix.mount", "mount it, with state: mounted for persistence."],
              ["ansible.builtin.parted / partition", "create the partition first."],
              ["order", "partition -> PV -> VG -> LV -> filesystem -> mount, every time."]
            ],
            remember: "Storage automates in the same fixed order you learned by hand: partition, PV, VG, LV, filesystem, mount."
          },
          {
            n: 5,
            title: "Managing network configuration",
            main: "The nmcli and firewalld modules cover configuring interfaces and the firewall.",
            simple: [
              "nmcli module for connections, firewalld module for zones, services and ports.",
              "Remember that on RHEL 8 and later the firewalld module talks to firewalld, not to iptables directly."
            ],
            example: ["- name: Set a static address", "  community.general.nmcli:", "    connection_name: work", "    ifname: ens160", "    type: ethernet", "    ipv4.method: manual", "    ipv4.addresses: 192.168.1.101/24", "    state: up", "", "- name: Allow https", "  ansible.posix.firewalld:", "    service: https", "    permanent: true", "    state: enabled"],
            parts: [
              ["community.general.nmcli", "manage NetworkManager connections."],
              ["state: up", "apply the connection."],
              ["ansible.posix.firewalld", "manage zones, services and ports."],
              ["permanent: true", "survive a reload."],
              ["state: enabled / disabled", "add or remove the rule."],
              ["zone", "which zone the rule belongs to."]
            ],
            remember: "nmcli module manages connections and state: up applies them; the firewalld module manages zones, not raw iptables."
          }
        ]
      }
    ],
    revision: [
      ["Packages", "dnf: name + state present/latest/absent"],
      ["Users", "user: name, groups, append: yes"],
      ["Groups", "ansible.builtin.group"],
      ["One-time jobs", "at module"],
      ["Recurring jobs", "cron module"],
      ["Volume groups / volumes", "community.general.lvg / lvol"],
      ["Filesystems / mounts", "ansible.builtin.filesystem / ansible.posix.mount"],
      ["Connections", "community.general.nmcli  (state: up)"],
      ["Firewall", "ansible.posix.firewalld"]
    ],
    inOneSentence: "Core administration becomes declarative modules — dnf, user, at, cron, lvg, lvol, filesystem, mount, nmcli and firewalld — and storage still runs in the same fixed order you learned by hand."
  },

  /* ============================ Part 9 — review, capstone, checklist */
  {
    id: "rh294-09",
    book: "RH294",
    bookTitle: "Red Hat Enterprise Linux Administration III",
    n: 9,
    title: "Review, Capstone and Checklist",
    partTitle: "Part 9 — chapter review, the capstone project, the skill checklist and the mixed quiz",
    exam: "RHCE (EX294) — revision across all objectives",
    source: "RH294 course material (Red Hat Enterprise Linux Administration III)",
    status: "written",
    sections: [
      {
        title: "Review and capstone",
        concepts: [
          {
            n: 1,
            title: "The capstone: automated secure web tier",
            main: "One project that touches nine of the ten chapters, built as a real project directory rather than one big file.",
            simple: [
              "This is deliberately cumulative — you cannot fake your way through it, because every earlier chapter is required to get one part working.",
              "Build it in a project directory with its own inventory, group_vars and roles, because that structure is what you will actually use."
            ],
            parts: [
              ["inventory/", "the hosts, in their own environment file."],
              ["group_vars/", "per-group variables, loaded automatically."],
              ["roles/", "reusable bundles rather than copy-pasted tasks."],
              ["vault", "any real secret goes in, encrypted."],
              ["test with --check", "before the first real run."],
              ["idempotence", "run it twice — the second run should report no changes."]
            ],
            remember: "Build the capstone as a real project directory, test with --check, and run it twice to prove it is idempotent."
          },
          {
            n: 2,
            title: "The skill checklist",
            main: "Be honest: 'can perform' means from memory, without reopening the guide.",
            simple: [
              "The value of a checklist is entirely in how honestly you fill it in.",
              "A skill you needed the book open for is not yet a skill, and the skipped items are your revision list."
            ],
            parts: [
              ["can perform", "from memory, unaided."],
              ["has performed", "you did it once but would want to check."],
              ["aware", "you know it exists but have not done it."],
              ["the skipped items", "these are what to revise."]
            ],
            remember: "Mark the checklist honestly — 'can perform' means without the book, and the gaps are your revision list."
          },
          {
            n: 3,
            title: "The arc of the three courses",
            main: "RH124 teaches you to run systems, RH134 teaches you to automate and secure them, RH294 scales both across many hosts.",
            simple: [
              "Each course assumes the one before. That is why RH294 opens by assuming you are already comfortable with systemd, storage and SELinux.",
              "It also explains why the RH294 material can be terse — the foundation is meant to be in place."
            ],
            parts: [
              ["RH124", "foundational administration on one machine."],
              ["RH134", "advanced administration and initial automation — RHCE level."],
              ["RH294", "scaling automation across an estate, with security built in."],
              ["the assumption", "each course builds on the previous, without re-teaching it."]
            ],
            remember: "RH124 runs systems, RH134 automates them, RH294 scales the automation — each assuming the last."
          }
        ]
      }
    ],
    revision: [
      ["Capstone structure", "inventory/ + group_vars/ + roles/"],
      ["First run", "--check --diff"],
      ["Prove idempotence", "run twice — second run reports no changes"],
      ["Secrets", "ansible-vault"],
      ["Honest checklist", "can perform = from memory"]
    ],
    inOneSentence: "The capstone brings nine chapters together as a real project directory; run it twice to prove it is idempotent; and RH124 runs systems, RH134 automates them, RH294 scales the automation."
  },
];