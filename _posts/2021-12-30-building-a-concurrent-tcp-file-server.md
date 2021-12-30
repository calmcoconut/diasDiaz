---
layout: post
title: Building a Concurrent TCP File Server in C
author: Alejandro Diaz
tags: computer science gios omscs C TCP
---

> ### tl;dr
> * We start build-up from our starting point of a simple echo-client and server, to a file-server
> * Make use of IPv4/IPv6 agnostic TCP sockets
> * Create a simple HTTP-like protocol to standardize and parse client requests

## Overview
_Overall requirements: IPv4/IPv6 agnostic, TCP, multi-threaded (server can service multiple clients simultaneously, parse and respond to requests in C (i.e., memory management, buffer allocation, byte parsing), implement a simple HTTP RESTful client-server application._

The server needs to receive and parse file requests from a connected client. Once the request is verified the server needs to serve the file's data to the client. Moreover, the server should handle multiple, concurrent connections.

These specifications are quite challenging if taken as is. However, if we break down the problem and build back up we can come to a good solution. Let's start from an echo-client and echo-server.

### Echo this: Sockets and such

Socket communication can be broken down into a few steps. From the server’s perspective to communicate with a client, we want to: allocate a socket, bind that socket, listen for incoming connections, and accept connections (allocating a new socket to that client). Similarly, from the client’s perspective, we want to allocate a socket, try to connect to a host, receive a response.

Several resources explain how to create an echo server and client application (I recommend this [book](https://www.google.co.jp/books/edition/TCP_IP_Sockets_in_C/11YK8bbqYkEC?hl=en&gbpv=0), but this [site](https://beej.us/guide/bgnet/) is excellent as well). We need these sockets to be IPv4/IPv6 agnostic. Thankfully, _<sys/socket.h>_ from the standard library has an interface to help with this problem.
The server needs to bind a socket able to service IPv4 and IPv6 TCP clients. Is there a way to do this succinctly without hacky or branching code? 

I will be using the _getaddrinfo_ function with the AI_PASSIVE flag to ensure our server can handle both protocol types. Similarly, the client should be capable of connecting to either IPv4 or IPv6 servers. Similarly, the client will also use the _getaddrinfo_ function to determine what socket to allocate for (what is the host's protocol?). We are careful to use the *AF_UNSPEC* flag to let _getaddrinfo_ know we want to wildcard our address family (IPv4/IPv6).

Sending a message is pretty simple. The client can call the _send_ function with its newly allocated socket. Note that the send function does not guarantee the entire message can be sent in a single call. To ensure we've sent the entire message, we call send iteratively. We stop the total sent bytes is equivalent to the size of the message. A nearly identical process plays out on the server-side when we call the _rcv_ function iteratively.

### Static File Server

The server and client can send and receive strings. We can make this a little more useful by serving connecting clients with a file instead of just echoing their message. 

Not much needs to be changed. We alter the server so that it now sends a stream of data. This stream comes from the file. Similarly, we modify the client, so it receives data iteratively from its connected socket until no more data is received. The client should write this data to its local directory, saving it as a new file.

### Dynamic File Server: taking client requests

OK. Now we have a server that serves a single static file. This is not very dynamic. Let's instead have the server take a request from a connected client. This means we will need to have the server receive and parse requests.

Whenever two parties are talking to one another, they need a set of rules. In a real web communication context, this is something like HTTP. Here we will use an HTTP-like interface. The result is that communication is structured.

1. client requests with a predictable request format
2. the server parses the received string, validates the request, and responds with a status
3. If validation is successful, the server proceeds by transferring the requested file's data
4. the client is disconnected and should connect again to make another request

Recall, this project is written in C. We send strings over the TCP socket via single char bytes. We put these characters into an array, then start to parse it. I found that using functions in C's standard library made the project much simpler than writing my own. I made great use of the _strtok_ function.

Depending on the results of the parse and validation, the server responds to the client with either an OK, ERROR, or INVALID status. The client will block until this status message is received.

On an OK status, the client will receive the data of the file in the same manner as the earlier implementation.

### Concurrency: Serving and requesting files simultaneously

We've gone from a simple echo client and server to a full-fledge server capable of serving files to clients. However, there is a final limitation. This server is only capable of serving one client at a time. What do we do if more than one client wants to connect and receive a file simultaneously?

One option is to have the clients queue up in a line and wait their turn (Imagine having to wait your turn to watch a YouTube video!). This is not a very good option.

Another option is to have the server launch another copy of itself when accepting a client. This copy of the program will handle the client while leaving the main instance of the server free to accept more clients. However, there is a lot of overhead associated with creating copies of programs. This option would work but would scale poorly.

The third option, which is what I chose, was to make the server multi-threaded. A multi-threaded server would have its main thread accept incoming clients, then load these clients into a queue. The queue, in turn, would be handled by a child thread that would fulfill the request.

I implemented this using the pthread's library. A callback function is registered with each thread. The function kicks off the client-handling portion of our implementation. These threads would sleep until the main thread signals that a client needs to be served.
