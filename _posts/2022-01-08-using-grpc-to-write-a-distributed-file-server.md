---
layout: post
title: Using gRPC to Write a Distributed File Server
author: Alejandro Diaz
tags: computer science 
---

>### tl;dr
> * we use gRPC to make a distributed file system which can "share" a directory among multiple clients, keeping the directory in sync.
> * gRPC simplifies client-server applications by taking care of infrastructure

How can we write a server-client application that behaves similar to dropbox, google drive, and other cloud storage solutions? In other words, how can we create a system where the changes in a client directory are propagated to the rest of the system, including the server and other clients?

We could code something from scratch, but it will be much easier and maintainable to use an established framework. Here I will use the [gRPC framework](https://grpc.io/). The gRPC framework is inspired by the procedure call paradigm first popularized by Sun RPC and others.
gRPC is a modern framework that handles a lot of the legwork common in client-server paradigms. It's fast, takes care of low-level infrastructure (network protocol, (un) marshaling data), and more). The framework will enable our server to communicate with all connected clients. This will make it possible to sync across the server and client directories, giving us a DropBox-like service (a distributed file system).

## Implementation details
As always, it's helpful to break down our requirements into manageable steps. At a minimum, the system should support the following:

* fetching a file from the server
* storing a file to the server
* deleting a file on the server
* retrieving the attributes of a file (created, modified, size)
* listing all the files on the server

Implementing these requirements is easier using the gRPC framework. The framework abstracts away most of the complexity between client and server communication. It enables servers and clients to communicate analogously to making a function call. The way this works is via client and server stubs. To create a stub we have to specify an interface. gRPC handles this with the proto3 Interface Definition Language (IDL). A full example can be found [HERE](https://developers.google.com/protocol-buffers/docs/proto3). Once we have defined the proto file, gRPC will use the specified interface to generate code when compiled. Overwriting the interface will allow gRPC to correctly mux requests to the correct server logic. That leaves us only responsible for implementing the logic behind each functionality.

Next, we need to enable asynchronous support in the gRPC framework. At the moment, our server and client can handle synchronous traffic, but this is not capable of handling what we want. Again, gRPC makes this relatively [simple](https://grpc.io/docs/languages/cpp/async/). Our design will take advantage of this. We will make a daemon that runs on our clients. Whenever a change in the client directory is detected, a corresponding request to the server will be made. For example, if a client deletes a file in their directory, then a delete request should also be routed to the server. Similarly, the server should broadcast any changes to its directory to all connected clients.

I chose to handle this problem by tracking what files are on the clients. Then, when a change occurs on the server, the server will send these details to all clients. Clients can then make a quick check of its local directory and change it to reflect the server's most current state.

## The difficult part
What if multiple clients are making changes that conflict with one another? For example, one client is trying to fetch a file while another is making changes to the file. Which file is valid? This is known as the readers writers problem.

For the distributed file system to work correctly, we need to implement some exclusivity guarantees. Particularly, when a client is writing to a file and when the server is deleting a file. I implemented this by using reader/writer locks. Essentially a reader lock allows multiple entities to have access to a resource, while a writer lock allows only a single entity to have access. The server should associate each file with a lock, and any client that has the lock should also be noted.

These locks in combination with a "lease" mean that a client making a write request can have a guaranteed amount of time where the client is given exclusive access. This lease must be timed to prevent the system from getting locked up on a misbehaving client.