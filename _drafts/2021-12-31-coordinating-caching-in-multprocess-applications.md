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
