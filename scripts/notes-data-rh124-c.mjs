/**
 * notes-data-rh124-c.mjs — RH124 Chapters 12-17
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

export const RH124_NOTES_C = [
  /* ============================================== Ch 12 — managing networking */
  {
    id: "rh124-13",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 12,
    title: "Managing Networking",
    partTitle: "Chapter 12 — TCP/IP, addressing, NetworkManager and name resolution",
    exam: "RHCSA (EX200) — 9.1-9.4 basic network configuration",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "The model and addressing",
        concepts: [
          {
            n: 1,
            title: "The four layers in plain terms",
            main: "Data moves down the layers on one machine, across the wire, and back up on the other.",
            simple: [
              "Each layer only talks to the layers beside it. Your application hands data to the transport layer, which labels it; the internet layer addresses it; the link layer physically sends it.",
              "On the receiving machine the same thing happens in reverse. This is why a problem at one layer does not affect the others — and why each has its own diagnostic tool."
            ],
            parts: [
              ["Application", "how programs talk to each other — ssh, https, NFS."],
              ["Transport", "ports and reliability — TCP, UDP."],
              ["Internet", "routing between networks — IP."],
              ["Link", "the actual hardware on this network — ethernet, MAC addresses."]
            ],
            remember: "Application → transport → internet → link, and each layer has its own tools."
          },
          {
            n: 2,
            title: "Reading an IPv4 address and prefix",
            main: "An address splits into a network part and a host part, and the prefix length says where the split is.",
            simple: [
              "Think of a street address: 'this street, number 42'. The prefix says which part names the street and which names the house.",
              "/24 means the first 24 bits are the network — so the last octet is the host."
            ],
            example: ["192.168.1.10/24"],
            parts: [
              ["192.168.1.10", "the address."],
              ["/24", "the first 24 bits are network — the last octet identifies the host."],
              ["/24 range", "usable hosts .1 to .254; .0 is the network, .255 is the broadcast."],
              ["network address", "192.168.1.0 for this example."],
              ["broadcast address", "192.168.1.255 for this example."]
            ],
            remember: "/24 means the last octet is the host — .0 is the network and .255 is the broadcast."
          },
          {
            n: 3,
            title: "IPv6 in brief",
            main: "IPv6 is 128 bits, written as eight groups of four hex digits, and RHEL runs both at once.",
            simple: [
              "The address space is enormously larger — enough for every device ever made, rather than nearly exhausted.",
              "Dual-stack means IPv4 still works alongside it, so nothing breaks during the transition."
            ],
            example: ["2001:db8::1", "ping6 example.com", "ip -6 addr show"],
            parts: [
              ["128 bits", "against IPv4's 32."],
              ["::", "compresses runs of zero groups — the full form may be very long."],
              ["dual-stack", "IPv4 and IPv6 both active by default."],
              ["link-local", "fe80:: addresses exist on every interface."]
            ],
            remember: "IPv6 is 128 bits, :: compresses zero groups, and RHEL is dual-stack by default."
          }
        ]
      },
      {
        title: "Inspecting the network",
        concepts: [
          {
            n: 4,
            title: "ip commands",
            main: "ip configures interfaces and addresses, and ss shows what is listening and what connections exist.",
            simple: [
              "These are the modern replacements for the older ifconfig and netstat, which are deprecated and may not be installed.",
              "Learn these names rather than the old ones."
            ],
            example: ["ip link show", "ip addr show", "ip route show", "ss -tulpen"],
            parts: [
              ["ip link show", "every interface, its state and its MAC address."],
              ["ip addr show", "interfaces plus their addresses."],
              ["ip route show", "the routing table — how traffic leaves."],
              ["ss -tulpen", "listening sockets and connections, with process names."],
              ["ifconfig / netstat", "the old names — deprecated, may be missing."]
            ],
            remember: "ip for configuration, ss for sockets — ifconfig and netstat are the old names."
          },
          {
            n: 5,
            title: "ping and tracepath",
            main: "ping tests reachability, tracepath shows the path.",
            simple: [
              "Ping answers 'can I reach it and does it answer?'. Tracepath answers 'which routers does my traffic actually cross?' — which is how you find where a connection breaks."
            ],
            example: ["ping -c 3 192.168.1.101", "ping -c 3 google.com", "tracepath 192.168.1.101", "dig servera"],
            parts: [
              ["ping -c N", "send N packets then stop, instead of running forever."],
              ["DNS resolved", "pinging a name shows the address it resolved to."],
              ["tracepath", "show each hop toward the destination."],
              ["dig / host", "query DNS directly."]
            ],
            remember: "ping tests reachability, tracepath shows the route, and ping -c stops after N packets."
          }
        ]
      },
      {
        title: "NetworkManager and nmcli",
        concepts: [
          {
            n: 6,
            title: "NetworkManager owns the configuration",
            main: "You do not edit network files directly — you tell NetworkManager what you want and it writes the files for you.",
            simple: [
              "Think of NetworkManager as the only person allowed to rearrange the furniture. Edit its files by hand and the next reload silently overwrites you.",
              "nmcli is how you give it instructions."
            ],
            example: ["nmcli device status", "nmcli connection show", "nmcli connection add type ethernet con-name work ifname ens160 ipv4.method manual ipv4.addresses 192.168.1.101/24 ipv4.gateway 192.168.1.1"],
            parts: [
              ["nmcli device status", "list hardware devices and their state."],
              ["nmcli connection show", "list saved connection profiles."],
              ["ipv4.method manual", "use the address you supply, not DHCP."],
              ["ipv4.method auto", "use DHCP."],
              ["ipv4.addresses", "the address and prefix to set."],
              ["profile vs device", "a device is the hardware; a connection profile is the saved settings."]
            ],
            remember: "Never hand-edit network files — tell NetworkManager via nmcli, it owns them.",
            warning: "A hand-edited connection file will be overwritten the next time NetworkManager reloads its settings."
          },
          {
            n: 7,
            title: "Changes take effect in two places",
            main: "Setting a profile's values does not apply them — you must also bring the connection up.",
            simple: [
              "nmcli connection modify changes the saved profile. nmcli connection up applies it.",
              "Forgetting the second half is the most common reason a change appears to be ignored."
            ],
            example: ["nmcli connection modify work ipv4.addresses 192.168.1.150/24", "nmcli connection up work", "nmcli device show"],
            parts: [
              ["modify", "change the saved profile only — nothing changes yet."],
              ["up / down", "apply, or deactivate, the connection."],
              ["reload", "re-read profiles from disk after editing files."]
            ],
            remember: "modify saves, up applies — do both or nothing happens."
          }
        ]
      },
      {
        title: "Hostname and name resolution",
        concepts: [
          {
            n: 8,
            title: "Setting the hostname and hosts file",
            main: "The hostname identifies the machine; /etc/hosts maps names to addresses locally.",
            simple: [
              "The DNS server is the public phone book. /etc/hosts is your private one-page list for local machines.",
              "hostnamectl or hostnamectl sets the name permanently — plain `hostname` only changes it until reboot."
            ],
            example: ["hostname", "hostnamectl set-hostname servera", "cat /etc/hosts"],
            parts: [
              ["hostnamectl set-hostname NAME", "set it permanently."],
              ["/etc/hosts", "local name-to-address mapping, checked before DNS."],
              ["/etc/resolv.conf", "which DNS servers to ask."],
              ["getent hosts NAME", "resolve using the real system order, hosts then DNS."]
            ],
            remember: "hostnamectl sets it permanently; /etc/hosts is your local list; getent shows the real resolution order."
          }
        ]
      }
    ],
    revision: [
      ["Show interfaces / addresses", "ip link show   /   ip addr show"],
      ["Show the routing table", "ip route show"],
      ["Show listening sockets", "ss -tulpen"],
      ["Test reachability", "ping -c 3 ADDRESS"],
      ["Trace the path", "tracepath ADDRESS"],
      ["List devices / profiles", "nmcli device status   /   nmcli connection show"],
      ["Add a static connection", "nmcli connection add type ethernet con-name NAME ifname DEV ipv4.method manual ipv4.addresses A/P"],
      ["Apply a profile", "nmcli connection up NAME"],
      ["Set the hostname", "hostnamectl set-hostname NAME"]
    ],
    inOneSentence: "Data moves application → transport → internet → link; ip configures and ss inspects; NetworkManager owns the files so use nmcli; and remember modify saves while up applies."
  },

  /* ================================ Ch 13 — archiving and transferring files */
  {
    id: "rh124-14",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 13,
    title: "Archiving and Transferring Files",
    partTitle: "Chapter 13 — tar, compression, scp, sftp and rsync",
    exam: "RHCSA (EX200) — 10.1-10.3 archiving and transferring files",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "tar archives",
        concepts: [
          {
            n: 1,
            title: "What an archive contains",
            main: "A tar archive holds the files' data plus their metadata plus an index, in one file.",
            simple: [
              "Think of packing a whole drawer into one box, including a list of what's inside. Because the index travels with the data, you can pull out one member without unpacking everything."
            ],
            example: ["tar -czf backup.tar.gz /etc/ssh", "tar -tzf backup.tar.gz", "tar -xzf backup.tar.gz -C /tmp/restore"],
            parts: [
              ["-c", "create an archive."],
              ["-x", "extract."],
              ["-t", "list the contents without extracting."],
              ["-f FILE", "the archive filename — almost always required."],
              ["-v", "verbose: show each file as it works."],
              ["-C DIR", "change directory before doing the work."]
            ],
            remember: "tar -c creates, -x extracts, -t lists — and -f FILE names the archive."
          },
          {
            n: 2,
            title: "Compression is a separate flag",
            main: "tar bundles, gzip compresses — the flags combine both in one step.",
            simple: [
              "Bundling many files and shrinking them are two different jobs, joined by different letters.",
              "Forgetting -z on extract is a common cause of 'it will not unpack'."
            ],
            example: ["tar -czf archive.tar.gz dir    # gzip", "tar -cjf archive.tar.bz2 dir   # bzip2", "tar -cJf archive.tar.xz dir    # xz, best ratio"],
            parts: [
              ["-z", "gzip — fast, the usual default."],
              ["-j", "bzip2 — a little smaller."],
              ["-J", "xz — smallest, but slowest."],
              ["must match", "the compression flag on extract must match the one used to create."]
            ],
            remember: "-z gzip, -j bzip2, -J xz — and the extract flag must match the create flag."
          },
          {
            n: 3,
            title: "The leading-slash message",
            main: "tar strips leading slashes so an archive cannot overwrite your system by accident.",
            simple: [
              "When you archive an absolute path, tar prints 'Removing leading /' and stores it relative.",
              "That message is a safety feature, not an error. It is why an extracted archive lands in the current directory rather than overwriting /."
            ],
            parts: [
              ["Removing leading '/'", "tar is protecting you — the paths were stored relative."],
              ["-P", "preserve absolute paths. Dangerous — only when you truly mean it."],
              ["relative paths", "are the safe default, and why restores land where you cd to."]
            ],
            remember: "'Removing leading /' is tar protecting you, not an error.",
            warning: "-P preserves absolute paths and can overwrite your system on extract. Do not use it casually."
          }
        ]
      },
      {
        title: "Transferring files",
        concepts: [
          {
            n: 4,
            title: "scp and sftp",
            main: "Both run over SSH, so they use the same keys and the same encryption as your login.",
            simple: [
              "Wherever ssh already works, these already work — no extra setup, no separate password.",
              "scp copies; sftp gives you an interactive file transfer session, similar to an old ftp but encrypted."
            ],
            example: ["scp file.txt student@servera:/tmp/", "scp -r dir/ student@servera:/tmp/", "sftp student@servera"],
            parts: [
              ["scp SRC DEST", "copy over SSH."],
              ["-r", "copy a whole directory."],
              ["user@host:/path", "the remote side — the colon is what makes it remote."],
              ["sftp", "interactive, encrypted transfer."],
              ["-i KEY", "use a specific private key."]
            ],
            remember: "scp copies over SSH with the same keys as your login; the colon marks the remote side."
          },
          {
            n: 5,
            title: "rsync",
            main: "rsync sends only the differences between the source and the destination.",
            simple: [
              "scp copies every byte every time — fine for a small file, wasteful for a large tree. rsync compares first and transfers only what changed.",
              "That is why rsync is the right tool for repeated syncs of the same directory."
            ],
            example: ["rsync -av /home/ student@servera:/home/", "rsync -avz /data/ student@servera:/data/", "rsync -av --delete /src/ /dst/"],
            parts: [
              ["-a", "archive mode: recurse and preserve permissions, times, symlinks."],
              ["-v", "verbose."],
              ["-z", "compress in transit."],
              ["-n", "dry run — show what would happen without doing it."],
              ["--delete", "remove destination files that are gone from the source."],
              ["trailing slash", "on /data/ copies the contents; on /data copies the folder itself."]
            ],
            remember: "rsync -a preserves and transfers only differences; a trailing slash decides whether the folder or its contents are copied.",
            warning: "--delete removes destination files that no longer exist in the source. Dry-run with -n first."
          }
        ]
      }
    ],
    revision: [
      ["Create an archive", "tar -czf FILE.tar.gz DIR"],
      ["List contents", "tar -tzf FILE.tar.gz"],
      ["Extract", "tar -xzf FILE.tar.gz -C DIR"],
      ["Compression flags", "-z gzip   -j bzip2   -J xz"],
      ["Copy over SSH", "scp [-r] SRC user@host:/path"],
      ["Interactive transfer", "sftp user@host"],
      ["Efficient sync", "rsync -avz SRC/ user@host:DEST/"],
      ["Safe preview", "rsync -avn (dry run)"]
    ],
    inOneSentence: "tar -c/-x/-t bundle and unpack with -f naming the file; compression is a separate flag that must match; and rsync -a transfers only what changed."
  },

  /* ========================== Ch 14 — installing and updating software packages */
  {
    id: "rh124-15",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 14,
    title: "Installing and Updating Software Packages",
    partTitle: "Chapter 14 — subscriptions, RPM, dnf, repositories and modules",
    exam: "RHCSA (EX200) — 11.1-11.4 package management",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "Subscriptions",
        concepts: [
          {
            n: 1,
            title: "Registering the system",
            main: "Registering attaches a Red Hat subscription to the machine so it can reach the official repositories.",
            simple: [
              "Until it is registered, the machine cannot download packages from Red Hat's servers — so this comes before any dnf install.",
              "The username and password are the ones from your subscription account, not the root password."
            ],
            example: ["subscription-manager register", "subscription-manager list --installed", "subscription-manager unregister"],
            parts: [
              ["register", "attach a subscription — needed before dnf can fetch anything."],
              ["list --installed", "show what subscription is attached."],
              ["unregister", "detach it, e.g. when snapshotting a lab VM."]
            ],
            remember: "Register before installing — until then the official repositories are out of reach."
          }
        ]
      },
      {
        title: "RPM underneath",
        concepts: [
          {
            n: 2,
            title: "What an RPM actually holds",
            main: "An RPM packages files together with metadata: name, version, dependencies, licence, and a scriptlet history.",
            simple: [
              "The metadata is why rpm -q --whatprovides works: the package manager knows every file it installed, which is how you trace a config file back to its package.",
              "Know the query flags — they answer most package questions instantly."
            ],
            example: ["rpm -q bash", "rpm -qi bash", "rpm -ql bash", "rpm -qf /usr/bin/bash", "rpm -q --whatprovides /usr/bin/bash"],
            parts: [
              ["-q NAME", "is it installed?"],
              ["-qi", "full information about it."],
              ["-ql", "every file the package owns."],
              ["-qf FILE", "which package owns this file? The reverse lookup."],
              ["--whatprovides", "which package provides this file — works even for a file no package has installed."],
              ["exit 1", "not installed — for rpm -q this is a valid answer, not an error."]
            ],
            remember: "rpm -qf FILE answers which package owns a file; exit code 1 from rpm -q just means not installed."
          }
        ]
      },
      {
        title: "dnf",
        concepts: [
          {
            n: 3,
            title: "Why you use dnf rather than rpm",
            main: "dnf understands repositories and resolves dependencies for you; rpm installs only the single file you name.",
            simple: [
              "rpm asks you to work out the dependency order yourself. dnf reads the repository, works out the whole set of packages needed, and installs them together.",
              "In daily use you almost always want dnf."
            ],
            example: ["sudo dnf install httpd", "sudo dnf remove httpd", "sudo dnf update", "dnf info httpd", "dnf list installed", "dnf provides */sshd_config"],
            parts: [
              ["install / remove", "add or delete a package."],
              ["update", "bring installed packages up to their newest available version."],
              ["info", "details, including which repository offers it."],
              ["list installed", "everything currently installed."],
              ["provides", "search for which package provides a file — the dnf answer to rpm -qf."],
              ["history", "a log of every transaction dnf performed."],
              ["history undo N", "roll back a specific transaction."]
            ],
            remember: "dnf resolves dependencies across repositories; rpm installs only the one file you name."
          },
          {
            n: 4,
            title: "CURRENCY: dnf, not dnf5",
            main: "On RHEL 10 the daily tool is still dnf; the separate dnf5 package is not installed by default.",
            simple: [
              "Some RHEL 9 and 10 documentation refers to dnf5, which is a different, faster implementation. It is available as a separate package.",
              "This was confirmed by observation on a live RHEL 10.2 host: dnf 4.20.0 is present and dnf5 is not installed. Use dnf."
            ],
            example: ["dnf --version", "rpm -q dnf dnf5"],
            parts: [
              ["dnf 4.20.0", "the installed tool on the verified RHEL 10.2 host."],
              ["dnf5", "a separate package, not installed by default."],
              ["use dnf", "for the exam and for normal administration."]
            ],
            remember: "RHEL 10 ships dnf, not dnf5 — dnf5 is a separate package you would have to install."
          },
        ]
      },
      {
        title: "Repositories and modules",
        concepts: [
          {
            n: 5,
            title: "Managing repositories",
            main: "A repository is a source of packages; dnf only uses the ones you enable.",
            simple: [
              "Think of a shopping list. A disabled repository is a shop you are not allowed into — its packages simply do not exist as far as dnf is concerned.",
              "Repository files live under /etc/yum.repos.d/."
            ],
            example: ["dnf repolist --all", "dnf repolist enabled", "sudo dnf config-manager --set-enabled REPO", "ls /etc/yum.repos.d/"],
            parts: [
              ["repolist --all", "every repository, enabled or not."],
              ["--set-enabled / --set-disabled", "turn one on or off."],
              ["/etc/yum.repos.d/", "where the repository definitions live."],
              ["BaseOS", "core OS packages, long-lived."],
              ["AppStream", "applications and streams, mid-life."],
              ["CRB / CodeReady", "extra content not enabled by default."]
            ],
            remember: "repolist --all shows everything; disabled means dnf pretends it does not exist."
          },
          {
            n: 6,
            title: "Application Streams and modules",
            main: "Application Stream splits large software into separately versioned streams, so you can run several versions side by side.",
            simple: [
              "Without modules you would have to choose one version of, say, PostgreSQL for the whole system. Modules let each application pick its own version.",
              "That is what removes the classic dependency conflict where two applications need different major versions of the same thing."
            ],
            example: ["dnf module list", "dnf module list --enabled", "dnf module enable postgresql:13", "dnf module reset postgresql"],
            parts: [
              ["dnf module list", "every stream available."],
              ["--enabled", "only the streams currently enabled."],
              ["module enable NAME:STREAM", "lock in a specific version."],
              ["module reset NAME", "remove the lock."],
              ["stream", "a version of one application."],
              ["module reset", "the way back out if you lock in the wrong stream."]
            ],
            remember: "Modules let different applications use different major versions of the same software."
          }
        ]
      }
    ],
    revision: [
      ["Register for updates", "subscription-manager register"],
      ["Is it installed?", "rpm -q NAME"],
      ["Which package owns this file?", "rpm -qf FILE   /   dnf provides FILE"],
      ["Install / remove", "dnf install / dnf remove NAME"],
      ["Update everything", "dnf update"],
      ["Repositories", "dnf repolist --all"],
      ["Modules", "dnf module list / enable NAME:STREAM / reset NAME"],
      ["Roll back a change", "dnf history undo N"]
    ],
    inOneSentence: "Register to reach the official repositories; rpm knows which package owns which file while dnf resolves dependencies across repos; and modules let two apps use different major versions of the same software."
  },

  /* ================================= Ch 15 — accessing Linux file systems */
  {
    id: "rh124-16",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 15,
    title: "Accessing Linux File Systems",
    partTitle: "Chapter 15 — block devices, mounting, and finding files",
    exam: "RHCSA (EX200) — 12.1-12.3 mounting file systems and finding files",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "Block devices and the tree",
        concepts: [
          {
            n: 1,
            title: "One directory tree for every disk",
            main: "Linux attaches every storage device into a single directory tree, so there are no drive letters.",
            simple: [
              "Unlike Windows, adding a disk does not create a new letter. Its contents appear as a folder inside the existing tree.",
              "The folder where a device appears is its mount point."
            ],
            example: ["lsblk", "lsblk -f", "blkid"],
            parts: [
              ["/dev/sd*, /dev/vd*, /dev/nvme*", "names for disks depending on the bus type."],
              ["/dev/sda1", "a partition on the first SATA/SCSI disk."],
              ["/dev/vg0/data", "a logical volume."],
              ["lsblk", "show devices, sizes and mount points as a tree."],
              ["lsblk -f", "also show filesystem type and UUID."],
              ["blkid", "show UUID and filesystem type without mounting."]
            ],
            remember: "Every disk joins the one tree at a mount point — lsblk shows what is attached where."
          },
          {
            n: 2,
            title: "Mounting and unmounting",
            main: "mount attaches a filesystem at a folder; umount detaches it.",
            simple: [
              "The folder must exist before you mount into it — create it first or mount fails.",
              "You cannot unmount a folder that is in use. That single rule causes most 'device is busy' errors."
            ],
            example: ["mkdir /mnt/data", "sudo mount /dev/sdb1 /mnt/data", "findmnt", "sudo umount /mnt/data"],
            parts: [
              ["mount SRC TARGET", "attach a filesystem at a folder."],
              ["umount TARGET", "detach it."],
              ["mount -a", "mount everything in /etc/fstab."],
              ["-t TYPE", "specify the filesystem type, e.g. -t nfs."],
              ["findmnt", "show what is mounted where — easier to read than mount output."],
              ["device is busy", "something is using the folder — cd out and close files there."]
            ],
            remember: "Create the mount point first; umount fails while anything is using the folder.",
            warning: "Unmounting a filesystem with unmounted-but-busy data risks losing writes. Close everything under the mount point first."
          },
          {
            n: 3,
            title: "UUIDs and persistent mounts",
            main: "Naming a mount by device path is fragile; naming it by UUID survives hardware changes.",
            simple: [
              "Device names like /dev/sdb can change between boots depending on detection order. A UUID is assigned to the filesystem itself and does not move.",
              "That is why /etc/fstab entries are written with UUID= on a modern system."
            ],
            example: ["blkid /dev/sdb1", "lsblk -f", "grep UUID /etc/fstab"],
            parts: [
              ["UUID", "a permanent identifier stored inside the filesystem."],
              ["/dev/sdb", "a name the kernel assigns — it can change between boots."],
              ["blkid", "read the UUID of a device."]
            ],
            remember: "Mount by UUID in fstab — device names can change, UUIDs do not."
          }
        ]
      },
      {
        title: "Finding files",
        concepts: [
          {
            n: 4,
            title: "find versus locate",
            main: "find walks the filesystem live; locate looks up a pre-built index and is instant but may be out of date.",
            simple: [
              "Imagine searching every room in the building (find) versus reading a directory list someone compiled yesterday (locate).",
              "A file you created two minutes ago is in the building but not on yesterday's list — which is why find finds it and locate does not."
            ],
            example: ["find / -name 'sshd_config' 2>/dev/null", "find /var -type f -mtime -1", "find / -user alice", "locate sshd_config", "sudo updatedb"],
            parts: [
              ["find PATH -name PATTERN", "search live. -name matches the filename."],
              ["-type f / -type d", "regular file or directory."],
              ["-size +100M", "larger than 100 MB."],
              ["-mtime -1", "modified within the last day."],
              ["-user alice", "owned by a user."],
              ["2>/dev/null", "silence the permission errors you will get searching /."],
              ["updatedb", "rebuild the locate database."]
            ],
            remember: "find searches live and is always right; locate is instant but needs updatedb after new files."
          },
          {
            n: 5,
            title: "Useful find combinations",
            main: "find is most powerful when you combine tests and actions.",
            simple: [
              "Two or three tests narrow it to exactly what you want, and -exec or -delete then acts on the results.",
              "Start narrow rather than piping to grep afterwards."
            ],
            example: ["find / -type f -size +100M 2>/dev/null", "find /tmp -name '*.tmp' -mtime +30 -delete", "find / -name '*.conf' -exec grep -l 'PermitRootLogin' {} \\;"],
            parts: [
              ["ANDing tests", "listing tests one after another means all must match."],
              ["-o", "or — either condition."],
              ["-exec CMD {} \\;", "run a command on each result; {} is the filename."],
              ["-delete", "delete the matches — try without it first."],
              ["-maxdepth N", "limit how deep to search — much faster."]
            ],
            remember: "Combine tests to narrow it down; use -maxdepth for speed and -delete carefully."
          }
        ]
      }
    ],
    revision: [
      ["See devices and mount points", "lsblk -f"],
      ["Get a filesystem's UUID", "blkid /dev/sdb1"],
      ["Mount / unmount", "mount SRC TARGET   /   umount TARGET"],
      ["Test fstab", "mount -a"],
      ["Read what is mounted", "findmnt"],
      ["Search live", "find / -name PATTERN 2>/dev/null"],
      ["By age / size / owner", "-mtime -1   -size +100M   -user alice"],
      ["Act on results", "-exec CMD {} \\;   /   -delete"],
      ["Instant indexed search", "locate NAME   (updatedb to refresh)"]
    ],
    inOneSentence: "Every disk joins the one tree at a mount point, mount by UUID because device names move, and find searches live while locate is instant but can be out of date."
  },

  /* ================== Ch 16 — analysing servers and getting support */
  {
    id: "rh124-17",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 16,
    title: "Analyzing Servers and Getting Support",
    partTitle: "Chapter 16 — Web Console, the Customer Portal and Red Hat Insights",
    exam: "RHCSA (EX200) — 13.1-13.2 obtaining support",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "Web Console (Cockpit)",
        concepts: [
          {
            n: 1,
            title: "A browser-based admin interface",
            main: "Web Console gives you a graphical interface to the server over HTTPS on port 9090, without installing a desktop.",
            simple: [
              "Useful when you want to look at a server from a laptop, or when you do not want to put a desktop on a headless machine.",
              "It is not installed by default and it does not start until you enable it."
            ],
            example: ["sudo dnf install cockpit", "sudo systemctl enable --now cockpit.socket", "sudo firewall-cmd --add-service=cockpit --permanent", "sudo firewall-cmd --reload", "https://servera:9090"],
            parts: [
              ["cockpit.socket", "the socket unit that activates it."],
              ["port 9090", "where it listens, over HTTPS."],
              ["enable --now", "start it and make it start at boot."],
              ["must allow the firewall", "or the browser simply cannot connect."],
              ["not installed by default", "dnf install cockpit first."]
            ],
            remember: "Web Console is not installed by default, needs enable --now, and must be allowed through firewalld."
          }
        ]
      },
      {
        title: "Support and Insights",
        concepts: [
          {
            n: 2,
            title: "The Red Hat Customer Portal",
            main: "access.redhat.com holds documentation, knowledgebase articles, downloads and support cases.",
            simple: [
              "The knowledgebase is where a documented fix for a specific error message usually lives, which is faster than searching the web.",
              "A support case needs a valid subscription."
            ],
            parts: [
              ["documentation", "the official product manuals."],
              ["knowledgebase", "articles indexed by error message — search the message, not the symptom."],
              ["cases", "support tickets, requiring an active subscription."],
              ["downloads", "ISOs, packages and container images."]
            ],
            remember: "Search the knowledgebase by the literal error message, not by a description of the problem."
          },
          {
            n: 3,
            title: "Red Hat Insights",
            main: "Insights runs a lightweight client that uploads configuration metadata so Red Hat can flag problems before they happen.",
            simple: [
              "It checks your running configuration against Red Hat's knowledge of what breaks, and tells you about issues affecting that particular combination of versions.",
              "It uploads metadata about the system, not your data. That distinction is worth being clear about."
            ],
            example: ["sudo dnf install insights-client", "sudo insights-client start", "insights-client status", "cat /var/lib/insights-client/insights-data.json | wc -c"],
            parts: [
              ["insights-client", "the agent on your machine."],
              ["insights-client start", "begin collecting and reporting."],
              ["metadata", "configuration facts, not your application data."],
              ["the rule", "clear the data with insights-client stop and clear."],
              ["recommendations", "proactive warnings about known issues affecting your version mix."]
            ],
            remember: "Insights uploads configuration metadata, not your data, and warns about issues affecting your exact version combination."
          }
        ]
      }
    ],
    revision: [
      ["Install Web Console", "dnf install cockpit"],
      ["Start it", "systemctl enable --now cockpit.socket"],
      ["Open the firewall", "firewall-cmd --add-service=cockpit --permanent && firewall-cmd --reload"],
      ["Reach it", "https://host:9090"],
      ["Start Insights", "insights-client start"],
      ["Check Insights", "insights-client status"]
    ],
    inOneSentence: "Web Console gives a browser admin UI on 9090 but must be installed and enabled; the knowledgebase is searched by exact error message; and Insights reads configuration metadata, not your data."
  },

  /* ================================================== Ch 17 — comprehensive review */
  {
    id: "rh124-18",
    book: "RH124",
    bookTitle: "Red Hat Enterprise Linux Administration I",
    n: 17,
    title: "Comprehensive Review",
    partTitle: "Chapter 17 — objectives map, command reference, practice scenario and exam-day checklist",
    exam: "RHCSA (EX200) — revision across all objectives",
    source: "RH124 course material (Red Hat Enterprise Linux Administration I)",
    status: "written",
    sections: [
      {
        title: "Review and practice",
        concepts: [
          {
            n: 1,
            title: "The highest-yield commands",
            main: "A small set of commands answers a large share of the exam.",
            simple: [
              "If you only have time to be fluent with a limited set of tools, these give the most coverage per minute spent.",
              "Knowing one command thoroughly beats half-knowing five."
            ],
            example: ["ls -l", "find / -name X 2>/dev/null", "systemctl status/enable --now SVC", "chmod/chown", "useradd -m/usermod -aG", "rpm -qf / dnf provides", "tar -czf / -xzf", "journalctl -u/-p/-f", "nmcli connection up", "ss -tulpen"],
            parts: [
              ["files", "ls -l, find, chmod, chown"],
              ["users", "useradd -m, usermod -aG, passwd, id"],
              ["services", "systemctl status / enable --now / is-active"],
              ["packages", "dnf install, rpm -qf, dnf provides"],
              ["logs", "journalctl -u -p -f"],
              ["network", "ip, ss, nmcli"]
            ],
            remember: "Be fluent with this list before learning anything rarer."
          },
          {
            n: 2,
            title: "Working a practice scenario",
            main: "Real administration problems arrive as a story: several machines, a complaint, and something to make work.",
            simple: [
              "The skill being tested is ordering: gather facts first, identify the actual cause, change the minimum, then verify.",
              "Changing several things at once leaves you unable to say which one mattered."
            ],
            parts: [
              ["gather", "read the error, check status and logs, look at the config."],
              ["identify", "find the cause, not the nearest-looking thing."],
              ["change minimally", "one thing at a time."],
              ["verify", "prove the symptom is gone, do not assume it."],
              ["record", "note what you changed and why."]
            ],
            remember: "Gather, identify, change one thing, verify — in that order, every time."
          },
          {
            n: 3,
            title: "Exam-day habits",
            main: "Time management and reading questions carefully decide more marks than obscure knowledge.",
            simple: [
              "Mark questions you cannot answer quickly and come back. A stuck question costs the easy ones behind it.",
              "Read what the question asks you to do — 'list' and 'show' want different outputs."
            ],
            parts: [
              ["first pass", "answer everything you can do quickly."],
              ["mark and move on", "do not burn five minutes on one item."],
              ["second pass", "return to the marked ones with the time left."],
              ["read the verb", "list, show, configure — they want different things."],
              ["verify", "check a changed service actually works, do not just that it started."]
            ],
            remember: "Mark what you cannot do and come back — a stuck question costs you the easy ones behind it."
          }
        ]
      }
    ],
    revision: [
      ["Highest-yield commands", "ls -l, find, systemctl, chmod, useradd -m, rpm -qf, journalctl, nmcli"],
      ["Problem-solving order", "gather -> identify -> change one thing -> verify"],
      ["Exam time", "first pass quick, mark the rest, return at the end"]
    ],
    inOneSentence: "Be fluent with a dozen high-yield commands, work problems by gathering first and changing one thing at a time, and on exam day mark what you cannot do rather than getting stuck."
  },
];