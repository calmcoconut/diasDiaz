---
layout: post
title: Using Human Computer Interaction (HCI) to Supercharge the Design Process
author: Alejandro Diaz
tags: computer science HCI design
---
>### tl;dr
> * You are not your users
> * Always, always conduct needfinding with actual/ potential users before touching code! Avoid bias by planning before gathering data
> * Evaluate your prototypes in front of users

## What is Human Computer Interaction (HCI)?
Human-computer interaction (HCI) is a relatively new interdisciplinary field involving technology, psychology, and engineering. It is a broad field whose scope includes or overlaps with UI/UX design, "smart" devices, and VR technology. 

HCI advocates for a structured, iterative approach to design. Ideally, a product will go through multiple stages. These stages present the product to actual users for feedback and evaluation. Designers should then use this feedback to make or brainstorm adjustments. The most important lesson that HCI advocates and the one takeaway you should remember is that: __You are not your user.__

It is counterproductive to assume what your users want, need, or do not like because you are not your user. You have a different background than your users and may use the product differently than users considering your product.

Herein lies the conflict with contemporary wisdom in Silicon Valley. HCI advocates a user-oriented process, while the common belief is to get a product out to market as fast as possible. What if I told you these two stances do not have to conflict? The rest of this article describes my understanding of HCI and its goal is to impart how you can use user feedback for a more user-centered design.

## An Overview of the HCI Design Process
HCI advises following iterative and repeating design cycle:

1. **Needfinding**. Determine what users want or need
2. **Brainstorming**. Propose design alternatives that may address needs discovered in needfinding
3. **Prototype** the idea
4. **Evaluate** with users, and repeat

The design process advocates for degrees of fidelity. You would not want to build a whole application only to receive poor feedback. Instead, the fidelity of the design should become more granular as the idea matures.

I will discuss how the process plays out using an example redesign of the dndbeyond.com character sheet.

## How can needfinding fuel product ideas and designs
Needfinding begins with defining a *problem space*, or a target domain.

> In the case of dndbeyond, the problem space was the character sheet.

Next, we identify our target users. We chart relevant questions, including:

* Who would use this product?
* Why would someone use this product?
* What are the demographics of these users?
* What is their expertise level?
* What is their motivation?
* What are users' frustrations in the problem space? What do they like?
* Should the product be easy to learn or cater to experienced users?

The next step of needfinding is to find some actual users. Yes. Go and interview, survey, make observations, read forums, review missed clicks, etc. These methods yield valuable insights to the questions we have charted above.

During needfinding be careful to outline potential biases you may inadvertently introduce. Everything from the design of survey questions, to your predisposition to come to a "correct" answer, may skew your results.

For example, I conducted interviews with users of dndbeyond.com. I wanted to reduce bias, so I went with a *mostly scripted interview,* so all participants were asked the same questions with a similar tone. Furthermore, I quantified responses by creating a rubric and applying it to recorded responses. The results of my needfinding exercise found that users were using dndbeyond.com with a combination of tools (e.g., VoIP like Skype) and mentally occupied by a game setting (playing DnD and talking with a group of people). The interviews led me to conclude that the dndbeyond character sheet application needed the least possible cognitive tax (i.e., summarizing information and presenting relevant actions without obfuscation) and should work well with VoIP applications.

## Needfinding can fuel Brainstorming and product ideas
The results of the needfinding exercise will naturally provide some constraints and goals when brainstorming.
 
> The interviews led me to conclude that the dndbeyond character sheet application needed the least possible cognitive tax (i.e., summarizing information and presenting relevant actions without obfuscation) and should work well with VoIP applications.

While this can make brainstorming easier, one should also be aware of research into brainstorming. Some suggestions include:

* Come up with a set number of ideas as a goal. Make yourself reach this number. This helps because you can narrow down ideas later.
* Don't critique ideas ("too silly, too expensive") during brainstorming. At this stage, the goal is to put ideas onto paper.
* When stuck, use extremes (most expensive, cheapest, smallest, etc.) to help fuel creativity.
* On a team, give individuals time to brainstorm independently before setting up a meeting. During the meeting, write down all ideas and don't discredit any.

As your brainstorming session matures, you should be ready to pick an idea to prototype.

## Prototypes can vary in fidelity, However they must be presentable to users
The goal of a prototype is to represent a product's design to users for feedback.

A prototype can be a drawing, a wireframe, a video, a pretend interaction, a version of the product, or even something else entirely. However, it must represent the product and give users a chance to interact with it.

For example, when I worked on prototyping a redesign of the dndbeyond.com website I used a wireframe I created in Figma. The wireframe allowed me to present users with a mockup of my ideas to evaluate.

## Users must evaluate the prototype
The evaluation phase is very similar to needfinding. However, this time the users are evaluating your prototype! 

Evaluate the prototype using the methods described in Needfinding (survey, interview). When evaluating your prototype, use the criteria you outlined during needfinding. Using the same criteria will help provide an objective grading of your prototype. It will also reveal where your prototype is better or worse than existing solutions. 

User feedback during the evaluation will help fuel your next iteration of the design cycle.

In the case of dndbeyond.com, I used a survey to gather evaluating the information on my prototype. I found the results of this study to be mixed. Users found my prototype highly favorable in some regards but mixed or worse in others. and this is ok! This is the crux of the design process. If I were to continue wanting to explore improvements to the existing product, I would start the cycle again. HCI supports iteration. Designs should center on the needs of the users. While users do not ultimately decide how a product moves forward, they should always have input in the design process.

## Next Steps
The design should continue to iterate through the design cycle. Conveniently, the evaluation phase gave us feedback on our prototype and can act like the needfinding stage, allowing us to move straight into brainstorming. If we are satisfied with the evaluation results, we should make a higher fidelity prototype and continue the process.

Even when a product is released, the design process should be incessant, making improvements to a design throughout the lifecycle of a product.


## Making the Design Process relevant to fast-pace engineering
Today’s dev environment is lightning fast. Often changes are made in a matter of days. Processes like Agile encourage fast development cycles. How then can we incorporate ideas from the field of HCI into modern software development?

A/B testing: have one group of users use one version of the product, and another group of users use a second version via random chance. Then collect data about the two user groups and compare.

Integrate the design cycle with Agile: after needfinding, have two teams run in parallel. The design team can run a week ahead in a sprint to give time to give data and results to the engineering team to implement

The above methods help "caffeinate" the design cycle, while still allowing user feedback and a user-centered design approach.