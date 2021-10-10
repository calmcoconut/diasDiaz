---
layout: post
title: An Introduction to Concurrency- OS Perspective (Part 1)
author: Alejandro Diaz
tags: computer science os multithreading lowlevel
---

> A readable summary of how an __operating system__ facilitates __multi-threading__ and how it works. This series of articles will cover key questions about how an Operating System works. After you read it, you will walk away knowing what the OS does behind the scenes to make your life easier when creating multi-threaded applications. You won't need much of any background to read this article, but it will help if you are familiar with a low-level language, like C. 
_If you want to learn more, the end of this article provides my sources and what you can use in your own studies._

## What even is an Operating System?
On a technical level, an operating system is a layer of software that sits above the hardware layer of a computer. Typically, it is the only piece of software on a system that has the privilege and power to manipulate the underlying hardware. File systems, networking, and disk access are all managed by the operating system. Other applications can not access the underlying hardware. Instead, they have to ask the OS for permission. In most operating systems, this means that the OS provides an interface for working with hardware. As a programmer, you don't have to worry about things such as hard disk drivers. Instead, you call to _open()_, and the OS kicks off the rest.

Besides being an arbitrator to the hardware layer, the operating system has two more important responsibilities. First, it must assure that all applications are modular (i.e., isolated) from each other. Modularity means that applications should each essentially think they have the computer to themselves. Why? Because if every program were able to see every other program, there is potential for accidental (or malicious) interactions that could cause the whole system to crash. For example, if chrome had access to every other program's memory, can you imagine what security risks this could cause? What if a virus could access or overwrite what was in memory for all applications on a system?

> Hold on! what is a memory?! Is it the 256 GB I have on my computer? No. You can think of memory as a lightning-fast phone book. Applications that are running have a bunch of addresses on hand that they use to look up resources an application is using. These resources are usually small enough to all be in memory (RAM).

An operating system must manage, allocate, and abstract the underlying resources of a system. The abstractions an operating system provides are vital for supporting modularity and simplifying the complexity of underlying resources.

## Abstractions, Mechanisms, and Policies
You may be thinking, why are abstractions even a thing? My application should be all-knowing and just work off the system's metal!

Well, if that were the case, we would have a lot tougher time programming between machines. The software would have to be made specifically for one system (or class of systems). Lack of compatibility __between machines__ was standard practice up until the late '80s! (i.e., analogous to PlayStation and Xbox rather than Windows XP and Windows Vista)

Abstractions let processes not worry about how much memory is on a system or what kind of ethernet is on the motherboard. It also allows engineers to upgrade the underlying hardware/software of these components without affecting existing applications. For example, when phones made the big switch from 3G to 4G in the 2000s. Newer phones were able to support both networks while running older applications. As far as the applications on these phones were concerned, a network connection was a network connection!

So, how does the Operating system manipulate the state of the hardware? How does the OS allocate memory to a process? or dispatch a program to the CPU to run? These processes are very __mechanical__ because they work in a set way, so we call them __mechanisms__.

Some systems may find it best to, for example, give the CPU to one process for a long, long time, while others might find it best to keep switching between processes. Varying ways of using mechanisms is an example of a __policy__. Policies manage how the system decides to use its mechanisms. Different machines will have different use cases (e.g., a home PC has different requirements an IBM mainframe!).

## Operating Systems seem complicated- what are their Guiding Principles?
__Optimize for the common case__. I hinted at this in the last section. OS designers have to consider what the system will be used for, its requirements, and its users/stakeholders. It is impossible to optimize for all cases, so designers have to implement their policies around these constraints.

__Separate mechanisms from policies__. Engineers need to offer mechanisms that are flexible enough to fit many types of use cases. Separating mechanisms and policies makes mechanisms more flexible. Flexible mechanisms enable different policies that are themselves now flexible enough to be changed by a user setting or circumstance.
> What challenges could arise if policies and mechanisms weren't separated? Can you think of any examples of both cases in/out of the computing world?

Phew, that was a high-level section. Let's get more concrete!

## Access, Privilege, and Hardware
User applications can never access hardware. There is a clear separation between system (privileged), _kernel_ level operations, and user level (un-privileged) contexts.

#### Hardware also plays a role. The Trap
A machine's hardware even facilitates the distinction between user and privileged access. The CPU has a special switch (a bit) that is flipped on/off depending on the system's access level. If the system is on a user level, the switch will be off. Then when an application attempts to access hardware, the CPU will check the status of this switch. If it is off, it acts as an alarm, and a hardware _interrupt_ occurs to hand control over to the Operating System. The OS then decides to continue or terminate the hardware procedure.

This describes a _boundary_ between privileged and user modes.

#### What does crossing the boundary look like? How do applications even get to save stuff on the machine?
The trap is just one way the boundary can be crossed. Other ways this crossing can occur is through:
* traps
* system calls
* signals

In each case, control is handed from the currently executing process to the corresponding handler. Generally, the handler is implemented by the operating system and lets the OS have control again.

> __The elephant in the room__ throughout this article, I have made hints that the CPU doesn't run more than one thing at a time. A big challenge in designing an OS is __efficiently__ running programs on the CPU. Generally, whenever the CPU is running an OS process, we consider it inefficient. Time used on a system process is time that could have been used on a user's tasks.

The handler has the instructions needed to give the application the resource is requested (such as reading/writing to a hard drive). There is friction in the flow of execution and who controls what. The important thing to remember is that it is the job of the operating system to facilitate user processes access to hardware resources.

The downside to handing control over (and crossing the privilege mode boundary) is the processing time. The operation is inherently expensive. Handing execution control back to the OS means that there is a switch in the execution context. The CPU has __locality__. That is, when the CPU runs a process, its resources are loaded into the CPU itself in the form of a __cache__. The swap in control means that the cache goes __cold__ because the resources loaded into the CPU are no longer relevant.
> What do you think a __hot__ cache is?

## Operating systems get their own fancy name for their interface: System Calls
Let's expand on what a system call is and what it looks like when we cross the privilege boundary with this interface.

1. The user-level process is happily chugging away- It makes a system call to access the hard drive (the application will make sure to have somewhere to save the result)
2. Control is passed to the OS in privileged mode. The OS's handler performs the operation
3. System call completes, execution context changes back to the user-level (un-privileged), and control is handed back to the user application (results save in the defined space the process made in step 1). 

Again, this process is expensive. Not only does the CPU go cold, but if the system call is slow, the process may have to halt until that completes (think of a loading screen for a game).

## More operating systems than just Windows and Macintosh!
Ok, let's make a quick detour as to what _types_ of operating systems there are.

#### Modular
Most operating systems modern computer users are familiar with _modular_ operating systems. Macintosh, Windows, most Linux distros (Ubuntu, etc.) are in this category. Modular operating systems are characterized as relatively complete OSs that also allow users to install additional software. The modularity of the OS makes the system easier to maintain, while also having a smaller footprint than other types of operating systems. The disadvantages here come from the installable software. Software installation can introduce unintended interactions. Furthermore, a modular OS has to have a level of _indirection_ (i.e., applications have to go through an OS implemented interface to work), which impacts performance compared to the next class of OS.

#### Monolithic
Historically, the most popular operating system. This type of OS is the grandpa of operating systems. Here, the operating system is the whole package. It includes all the applications the user will use as a part of the system. These operating systems did allow users to run files from a disk or other peripheral device but did not allow installations. 

> Commodore is a great example, but also mainframes and even some web servers today are still considered monolithic operating systems

The advantage of this design is that all optimizations can be made since engineers know exactly what will be running on the machine. The disadvantage of this system is that there is no ability to customize or portability (applications are built for one OS and one OS only). Furthermore, these systems have higher overhead because of the completeness of the package. They can also be difficult to maintain.

> Do you think your smartphone's operating system is monolithic or modular? Why?

#### Microkernel
This type of operating system is super tiny compared to the others. Its size makes it ideal for embedded devices because the entire OS is __verifiable__. Because of its size, a microkernel OS ships slim. It lacks many of the convenient interfaces that a modular OS would provide. Instead, it expects its user to implement whatever additional functionality the device will need. This means that this system experiences more frequent user/kernel crossings. Another disadvantage is its portability (applications have to be designed for that OS), development complexity (you have to implement what the OS would normally have available to you).

## Summary and Readings
This article is part one of a multipart series on Operating systems. Here you learned the types of operating systems, what an operating system is responsible for, and made initial conceptualizations of how an OS manages and organizes user applications and resources. In part 2, we will introduce processes and threads.

#### Resources and Further Readings
1. Arpaci-Dusseau, R. H., & Arpaci-Dusseau, A. C. (2018). Operating systems: Three easy pieces. Arpaci-Dusseau Books, LLC.
Donahoo, M. J., & Calvert, K. L. (2009). TCP/IP Sockets in C: Practical Guide for Programmers. Elsevier. http://public.eblib.com/choice/publicfullrecord.aspx?p=428534
2. Hall, B. “Beej J. (2020). Beej’s Guide to Network Programming. beej.us. https://beej.us/guide/bgnet/html/#connect
3. Kerrisk, M. (2010). The Linux programming interface: A Linux and UNIX system programming handbook. No Starch Press.


'Till next time space cowboy

-- Alex