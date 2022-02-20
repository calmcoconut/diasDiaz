---
layout: post
title: Human-Like AI with generate and test
author: Alejandro Diaz
tags: computer science 
---
>### tl;dr
> * Generate-and-Test is a human-like AI method that can solve complex problems by creating plausible states intelligently

## title
Give an infant some shapes and a shape sorter and watch them try to fit each shape into a slot. We call this method generate-and-test. A machine can use generate and test to solve various problems, using simple, human-like AI. This article will discuss using generate-and-test to solve the Tower of Hanoi with the fewest moves possible.

![tower of hanoi](../assets/images/20220220-human-like-ai-with-generate-and-test/Picture1.png?style=centerme)

The first step to this problem is figuring out how to represent it. The illustration gives a hint. Each block is either:

* On the table
* On another block

Additionally, each block is either in its goal position or not in its goal position.

At its most basic, generate and test is a simple algorithm. However, that won’t cut it here. We will experience combinatorial explosion if we try to generate all the possible states (1 block = 1 state, 2 blocks = 4 states, 3 blocks = 6 states). so we must endow either the generator or tester with some intelligence.

We can do this by sub-dividing this problem into **sub-goals**. Here we want to get each block into its goal position and preserve it. To do so, we can add the following rules to our state generator:

* Do not move a block on the table to the table
* Do not move a “settled” block
* Do not move a block onto a “settled” block unless that block would also become settled

We have made the generator smarter. It automatically rules out and limits our problem space. Let us do the same thing to the component of our code that tests a path.
We can have our tester prefer to look at states with the greatest number of settled states (the sub-goal) and/or states with the fewest differences between them and the goal state. This can confine the number of paths we look at before moving to the next node. Now, these two components can efficiently solve the problem!

This algorithm is very human-like in its approach. The AI agent, like us, will want to prioritize placing blocks into their final position. Just like a human, the agent will make moves that would get us closer to the goal without having to mess up the work we’ve already done!
