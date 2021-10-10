
---
layout: post
title: An Introduction to Concurrency- OS Perspective (Part 2)
author: Alejandro Diaz
tags: computer science os multithreading lowlevel
---

> A readable summary of how an __operating system__ facilitates __multi-threading__ and how it works. This series of articles will cover key questions about how an Operating System works. After you read it, you will walk away knowing what the OS does behind the scenes to make your life easier when creating multi-threaded applications. You won't need much of any background to read this article, but it will help if you are familiar with a low-level language, like C. 
_If you want to learn more, the end of this article provides my sources and what you can use in your own studies._
_Make sure to check out [part one](https://calmcoconut.github.io/diasDiaz/An-Introduction-to-Concurrency-a-OS-Perspective/)_.

# Processing a Process
In [part one](https://calmcoconut.github.io/diasDiaz/An-Introduction-to-Concurrency-a-OS-Perspective/) we used the term "process" and "application" interchangeably. This is not entirely correct, as you will see. An application can be made up of one or more processes, each still __isolated__ and __modular__ with its own resources and data. A process is the most basic unit of work on the user level.

Note, part will be more in-depth than part 1. If anything looks confusing, feel free to skip it. The important stuff is the conceptual level and why things happen. You can always look up the details!

## Processes
Each process has a collection of identifiers that make it work. At its core, a process represents a state of execution. It has to have the resources to represent this state of execution at any given point. To do this, the OS allocates each process with a:

* __Program counter__, a counter held in the CPU that tracks what line of execution the program is on
* A __Process ID__
* A __Virtual address space__, the OS will allocate each process with memory, but to the process, this allocation looks like the entire machine's memory! In reality, the OS has abstracted and __decoupled__ physical memory to virtual memory. This simplifies memory management
* A __Stack pointer__, each process has a unique stack. At its core a stack is simply a place in memory that lets a program track what data it currently is using in its scope
* A __Heap__, a section of memory that holds dynamically allocated data for the process
* __Static data/text__, loaded in when the process first launches, does not change throughout execution
* __CPU register state__, the state of registers when the process is working, may change throughout execution

It is important to remember that processes are completely modular, each having their own __unique__ resources. Recall, that one of the operating systems main missions is to guarantee that processes are isolated from each other. All this information gets stored as a _process control block_ (PCB).

## Process Control Block (PCB)
We listed a lot of information just now. The OS has to track all of this information along with some scheduling information with each process. Operating System engineers came up with the _process control block_ to do just that.

This data structure is created when the process is initialized by the OS. For example, the program counter is initialized to the first instruction if the process is new. These fields are updated only when they change (e.g., program counter pointing to the next line). The operating system is responsible for updating the PCB.

The PCB is used to track the state of execution of any given process in a way the OS can know about it. This is important because no one single process is allowed to dominate the CPU. Indeed, the OS must enable each process on a machine to get a turn on the CPU. This is one of most important applications of the PCB, it enables the OS to save and restore processes from/onto the CPU.

The switching of processes, or context, is called a __context switch__.

## Context switches
OS engineers DREAD context switches. Context switches are very expensive operations. First, The OS has to use a number of CPU cycles just to store the current processes information into its PCB and load the new processes state from its PCB. Second, a context switch will result in a __cold cache__ (see part 1), also slowing down execution.

Plainly, it is the interest of the operating system to avoid context switching whenever possible.
> What do you think are some policies an OS can use to avoid context switching? When would the OS be forced to context switch? Keep context switching in mind as you read the rest of the article.

## Process lifetime
ADD IMAGE
Each process goes through this life cycle. Let's discuss what each stage entails:
* __new__: Process gets created; the OS allocates and creates a process control block for the process and its resources (heap, stack)
* __ready__: The process waits until the scheduler gives decides to dispatch it to the CPU. The scheduler maintains this queue.
* __running__: The process is on the CPU. May be pushed off by a context switch or interrupt. If this happens, the process will be put in ready. On a longer operation (system call like read()), the process will be put onto _waiting_. The scheduler decides when to context switch.
* __waiting__: Processes here are completing some longer event. Usually, this is handled by the peripheral, e.g., the OS will request the data from the hard drive.
* __terminated__: A process which completes and exits, or falls into an error code.

## What role does the OS scheduler play?
As the image above illustrates, a process moves from state to state. The scheduler is most prominent when a process is moving from the ready stage to running or from running to any other stage. The order processes run are determined by the CPU scheduler. To manage the CPU, the OS must be able to:

* __Preempt__: interrupt and save the current context of the executing process
* __Schedule__: determine what to run next, depending on the operating system's scheduling policy
* __Dispatch__: send the chosen process to the CPU and initiate a context switch

> Naturally, the next question is how often should the scheduler run? The answer is it depends on the OS's policies and the state of the process. For example, if the process blocks, if it takes less time to context switch than it does for the process to finish its blocking operation, it may make more sense to go ahead and run the scheduler for a context switch. Note this all effects CPU efficiency, or _(total time doing user work)/(total time doing user work + total time doing OS work)_.

A common occurrence when the scheduler has to run is when the running process makes an read or write request. The process makes a request to the OS in the form of a system call. The OS handler then runs its instructions, subsequentially placing the process on the devices I/O queue. When the device is ready to respond, it does completes the request, and the process is moved to the ready queue by the scheduler.

The life cycle is intricate, but its flow is based on using the CPU's time as effiently as possible within the parameters of the OS's policies. There is no rule for how long a process will run. Some systems want equal timeslices for all processes, while others want to prioritize some processes over others. This all depends on the metrics users care about.

## Can processes communicate with each other?
Recall, that one of the guiding principles of OS design is modularity of user processes. This remains true, but designers also allow for _inter-process communication_ (IPC) through special means. This is not a default behavior, communication has to built from these mechanisms that facilitate IPC. It's important that these mechanisms still maintain protection and isolation.

The first type of IPC is called __Message-Passing__. Here, the OS opens a channel of communication for the two processes (like a shared buffer). The processes write and receive from the shared channel to communicate. This is nice because the OS acts as a mediator and provides a useful interface. The downside is that because the OS is involved, there is a hit to performance.

The second IPC method is called __Shared Memory__. Here, the OS establishes a shared channel and maps it into each of the process's address space (memory). This makes communication fast, but the OS does not mediate, so its up to each process to create their own read/write methods. This may lead to errors and overhead.

# Threads
We finally have all the pieces we need to talk about threads with enough context!

### Thread lifetime
## Synchronization and Parallelization
### Blocks and transitions
### Interprocess communication (IPC)
### What is multi-threading? What are the benefits?
### Is multi-threading relevant on a single core/CPU machine?
### Common multi-threading Patterns: Concurrency at work
#### Boss Worker Pattern
#### Pipeline Pattern
### Pitfalls of Multi-threading
### Synchronization