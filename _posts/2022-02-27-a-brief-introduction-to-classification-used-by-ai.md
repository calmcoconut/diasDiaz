---
layout: post
title: A Brief Introduction to Classification used by AI
author: Alejandro Diaz
tags: computer science 
---

Have you ever gotten a captcha test that asks you to click all the busses or streetlights? Why such a specific question, like streetlights? You are actually training a machine to classify everyday objects!

Classification allows a model to make assumptions. It is a generalization made to quickly make decisions using a precomputed set of rules and characteristics. For example, when a child mistakenly calls a cow a big dog, the child has just tried to classify the cow as a dog. A cow and a dog share traits (4 legs, fur, a mouth). However, when you point out that it is a cow, the child has to correct their model using narrowing techniques (dogs are small, cows are large, etc.).

We can apply this same learning technique to an AI agent. A **version space**  representation tries to narrow a classification class from broad to narrow enough to be useful for classifications.

A version space creates two trees: a narrow and a broad tree. The narrow tree is the most specific classification of the concept possible, while the broad tree is the most general. The representation is fed positive and negative examples of what we are trying to train. On a positive test case (e.g., this labrador is a dog), we make the agent **broaden** its concept by giving it to the narrow tree to generalize. On a negative example (e.g., this cow is not a dog), the version space **narrows** its broad tree to specialize the model. We do this repeatedly until we’ve specialized and generalized from the examples provided and our two trees agree. 

The Version Space algorithm is efficient and powerful enough to take hundreds of cases and help to train an AI model to classify objects.