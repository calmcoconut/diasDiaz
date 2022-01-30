---
layout: post
title: Writing a Time Management Android Application- TimeTime
author: Alejandro Diaz
tags: computer science android java timetime
---

## Motivation and Overview
TimeTime was my first large, independent project. My motivation was two-fold. First, I wanted a project to help build my understanding of software architecture and the Android framework. Second, I wanted an application centered on privacy and gathering personal and work metrics. 

TimeTime took inspiration from an already existing application on the Android App Store. However, this application lacked desired features, stored data remotely, and locked premium features behind a subscription model. 

With my new goal in mind, I started to layout requirements and an initial design.

## Defining the project requirements

I had a rough idea of my requirements going in because another app on the Appstore inspired me to make my own:

-         Lockscreen prompts
-         A log screen
-         A statistics and graph screen
-         Create activities with different colors and logos
-         Categorize activities
-         A localized database that allows export of data into CSV format

These are a lot of features for someone learning Android. I made the mistake of trying to brute-force an application and create it without a plan. The result was bad code. The key takeaway from this project is **always** to have a plan. Even a poor plan is better than an absent plan.


## Designing the software
I started by creating a wireframe prototype of my ideal app. The wireframe captured the look I wanted for each screen and component of the application. 

Then I needed to think about the software architecture of the app. What will time logs look like? How will they be stored in the database? What type of database will I use? How will the application talk to the database to retrieve and display logs?

After some research, I decided to adopt a Model View Controller (MVC) approach. The user interacts with the app, the app interfaces through a controller class that abstracts communication with the database in my application (I used RoomDB with DAO support).
Then when the app needs to display data from the database it uses the View class interface to make the appropriate calls to the database. 

Why is this important? It creates layers of abstraction. Layers separate responsibility while making the code maintainable.

A user's primary interaction with the application is to log their time. Each log is associated with an activity (sleeping), a category (health), and a duration (11 PM-8 AM). These requirements naturally gave a database schema. However, the issue of time is sticky. How should we store it? The application requires us to present the duration in a human-readable format, but this does not mean we should store it as a string. 

Storing the period as a string would make the database inflexible and cumbersome. Instead, I chose to store duration as a start and end epoch. Java has several good standard library functions to deal with epoch and human-readable format. The log class made use of these standard applications and abstracted any complexity between epoch and human-readable formats.

The backend architecture of the app is in place. However, this does not handle what the user sees, just the organization of our program.

In android, a given page is represented using fragments. Let's walk through the application starting with the homepage.

## Designing the Front-end
The wireframe I built earlier provided a solid foundation to build the frontend (colors, UI, etc.). After initializing a tabbed layout, I went to work on creating the home fragment.

![home]({{ baseurl | relative_url }}/home.png)

The home page needed to be populated by cards showing the user's recent activities. Furthermore, it needed to be a RecyclerView ("infinite" scrolling) to provide efficient retrieval. 

The other requirement of the home page was to provide a way to log activities. I used a Floating Action Button (FAB) with a "+" on it. The FAB will also be present on most other fragments but with a responsibility corresponding to that tab.

![log](./logtime.png)

The activity and categories fragments are similar. They show the user the activities or categories they have in their database. Users can create custom categories or activities via the FAB.

![activity](/assets/images/2021-01-30-writing-a-time-management-android-application-timetime/activity.png)

![create activity](/assets/images/2021-01-30-writing-a-time-management-android-application-timetime/createActivity.png)

![category](/assets/images/2021-01-30-writing-a-time-management-android-application-timetime/category.png)



Finally, A statistics page aggregates the user's database and presents data visualizations.

![stats period](/assets/images/2021-01-30-writing-a-time-management-android-application-timetime/statperiod.png)

![category](/assets/images/2021-01-30-writing-a-time-management-android-application-timetime/stat.png)

## Tidbits: Notifications and Lockscreen prompt
I wanted the application to be opened maybe once a week by a user. Ideally, the user only interacts with the application via notifications. In TimeTime, there are two types of notifications: traditional and full-lockscreen. Both notification types must use a daemon thread and an alarm to trigger them.

The challenge was to create a full-lock screen notification. This notification would "take over" the user's lock screen to show the "log your time" screen, so the user can log what they've been up to without having to remember to open the application, or having to stop what they're doing. I built this type of notification with Android's PendingIntents.