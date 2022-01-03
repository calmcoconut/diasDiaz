---
layout: post
title: Coordinating Caching in multi-process applications
author: Alejandro Diaz
tags: computer science 
---

> ### tl;dr
> * Caching makes huge performance improvements. Here we work on integrating a server-side caching application with a server
> * To communicate between processes we have to use POSIX message queues, shared memory, and semaphores

## Motivation and Overview

It is usually a good idea to cache the data a server will need in memory. The alternative is to always store data on storage or remotely. Retrieving from such secondary storage will take exponentially more time than retrieving from memory. Often this is counteracted by keeping frequently retrieved data in the main memory. However, our server program should not be monolithic. Instead, we can design our server to run a function when a request is made. The function will ask a caching process if the request is stored in memory. If the requested data is available, the caching process shares the data with the server process. Otherwise, the server can try to retrieve it from secondary storage.

## Implementation details
The challenge of our requirements is in coordinating the server and caching applications. In fact, how does one even coordinate two separate processes? They do not share the same memory space and execution contexts. After all, this is the advantage to separating processes: isolation and security. However, we can bend the process isolation principle by asking the operating system. 

Let's first focus on what exactly we need to achieve to implement a successful application:

1. How does the server process ask the caching process for a file?
2. How does the caching process respond to the server?
3. Additionally, how does the cache send the data to the server?

Importantly, all of these steps should occur rapidly, so this takes using files off the table to coordinate (otherwise, we may as well use secondary storage!).

### Kicking off the talks: asking for a request
My design uses a message queue to make requests to the caching process. The POSIX message queue allows for processes to communicate on the machine. It also provides a convenient API and will block a thread. In this case, blocking a thread works to our advantage as it coordinates the cache process so that the cache process is asleep until it receives a request.

My design uses a message queue to make requests to the caching process. The POSIX message queue allows for processes to communicate on the machine. It also provides a convenient API and will block a thread. In this case, blocking a thread works to our advantage as it coordinates the cache process so that the cache process is asleep until it receives a request.

The server has access to this inter-process queue. Each message acts as a request. The request specifies the file and a shared memory segment to respond over (more on that in a second).

Our cache's main thread will be concerned with just checking this message queue. Worker threads will concern themselves with fulfilling requests.

The data transfer process is orchestrated and synchronized with a pair of semaphores living in the assigned shared memory.Each message in the assigned shared memory.

### Talking back: how does cache respond and fullfil a request?
The POSIX shared memory segments are initialized and assigned unique IDs at the server's startup. When a client makes a request, the server passes the shared memory segment ID as a message to the cache over the message queue. 

Each memory segment has two semaphores. The worker thread will block on its semaphore (and the cache on the other when it finishes writing a response) until the cache increments it (unblocking the thread). The server's worker thread will only be unblocked once the cache has finished writing its response (the data) in the shared memory segment. If there is a large amount of data, this cycle continues until all data is delivered to the server (the server can send this data off to the client iteratively as well).

I found it best to structure the shared memory segments using a C struct. These structs make it possible to write data to the shared memory segment without making address adjustments (because the two processes likely map virtual memory addresses differently).

### Etc.
POSIX inter-process communication paradigm is based on the "everything is a file" idea. And while message queues and shared memory segments are not really files, they are represented as such (on RAM, NOT disk!). That means they will continue to persist even after the programs that have initialized them stop running. We don't want this to happen, especially in active development and testing. So as an added challenge, I had to write signal handlers that specifically take care of cleaning up these structures (along with other malloced memory). This consisted of changing the behavior of SIGTERM and SIGINT to first unlink and destroy these structures before ending their respective programs.