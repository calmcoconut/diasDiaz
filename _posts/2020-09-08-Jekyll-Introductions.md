---
layout: post
title: Host A Static Website with GitHub Pages And Jekyll
author: Alejandro Diaz
tags: Jekyll githubPages wsl2
---
<p>Jekyll is a great tool if you want the simplicity of a static website but with more complicated functionality. It offers a load of plugins and maintenance saving methods.</p>
<p>The primary advantages are:</p>
<ul>
<li>templating</li>
<li>variables and loop functionality</li>
<li><strong>support for GitHub pages (a free webhosting platform for anyone with a GitHub account)</strong></li>
<li>plugins, database free solutions, and niche cases</li>
</ul>
<p>If this is tempting strap in and I’ll describe my weekend setting up <a href="https://jekyllrb.com/">Jekyll</a>.</p>
<h4 id="set-up">Set up</h4>
<p>You will want to give the Jekyll [quick setup] (<a href="https://jekyllrb.com/docs/">https://jekyllrb.com/docs/</a>) page a look (For this tutorial do only steps 1 &amp; 2). Very friendly if you are on Linux or Mac, not so much on Windows.</p>
<h5 id="windows">Windows</h5>
<p>Lucky for you, I am on Windows which means we’re on Linux. Head over to the <a href="https://docs.microsoft.com/en-us/windows/wsl/install-win10">WSL2</a> (Windows Subsystem for Linux- what a time to be alive) page and set it up. grab a Linux distro from the Microsoft store (Ubuntu) and run these commands:</p>
<ul>
<li>launch WSL from command prompt<br>
<code>wsl</code></li>
<li>run update (sudo is like as adminastrator in windows)<br>
<code>sudo apt update &amp;&amp; sudo apt upgrade -y</code></li>
<li>clean system<br>
<code>sudo apt-get autoremove</code></li>
<li>install Ruby</li>
<li><code>sudo apt-get ruby-full</code></li>
<li>install GCC and Make</li>
<li><code>sudo apt install build-essential</code></li>
<li>follow quick start from <a href="https://jekyllrb.com/docs/">Jekyll</a> (Steps 1 &amp; 2)</li>
</ul>
<p>Nice, now we windows users are caught up to the Max and Linux.</p>
<h4 id="choosing-a-theme">Choosing a theme</h4>
<p>This is the fun part of the project. Jekyll has been around for a decent amount of time and the community is mature enough to be both helpful and provide loads of materials. Do a google search for Jekyll themes and you will find a ton. For this tutorial we will use <a href="https://jekyllthemes.io/">https://jekyllthemes.io/</a></p>
<p>Now that you have found a theme you fancy click on the “Theme Name on GitHub” button on the right-hand side of the page. If you have never used GitHub before don’t be intimidated, it is at its core a file hosting site for developers.</p>
<p><img src="https://images2.imgbox.com/a7/af/dUWXxup4_o.png" alt="A Screenshot of a theme" title="screenshot of a theme"></p>
<h5 id="figuring-out-git">Figuring out Git</h5>
<p>Ok I take it back; this next part may be a little intimidating. Open your terminal (if you are on Windows, open CMD and type WSL) and type the following git command:</p>
<p><code>git --version</code></p>
<p>If you are greeted with a version number, you are good to go. Otherwise give <a href="https://git-scm.com/book/en/v2/Getting-Started-Installing-Git">this article a read</a>. <strong>Use Linux / Mac instructions</strong>.</p>
<p>Pick a folder where you’d like to work on your computer and copy the address. You can navigate to it using the cd (Change Directory) command. If you would like to follow my setup do the following:</p>
<p>**You are going to want this in a Linux/ Mac location<br>
<em>go to home directory</em><br>
<code>cd ~</code><br>
<em>create projects folder</em><br>
<code>mkdir projects</code><br>
<em>create web  folder inside projects</em><br>
<code>cd projects</code><br>
<code>mkdir Web</code><br>
<em>you should see Web after running the above. ls command just lists files</em><br>
<code>ls</code></p>
<p>Now you will <em>clone</em> the theme you selected from GitHub in the folder of your choosing. To do this, go back to the theme’s GitHub page and find CODE button and copy the link that appears when it is clicked.</p>
<p><img src="https://images2.imgbox.com/70/c8/ZoW4oZUw_o.png" alt=" " title="screenshot of code"></p>
<p><strong>make sure your terminal is at the right location (see the prompt’s address).</strong> and use the git clone command<br>
<code>git clone [URL]</code><br>
Typing the ls command should show a new folder with that projects default name.  We wont worry about changing the folder name for now. Let’s give our new site a test run.</p>
<h4 id="running-jekyll">Running Jekyll</h4>
<p>Start by changing directory into our theme folder<br>
<code>cd theme-folder-name</code><br>
update and install jekyll plugins<br>
<code>bundle update</code><br>
<code>bundle install</code><br>
launch a local web server to see your site in action (only available to you)<br>
<code>bundle exec jekyll serve</code><br>
go to your web browser and go to<br>
<a href="http://127.0.0.1:4000/">http://127.0.0.1:4000/</a><br>
To stop the local server CTRL + C in your terminal</p>
<h5 id="balmy-could-not-locate-gemfile">Balmy! <em>Could not locate Gemfile</em></h5>
<p><img src="https://images2.imgbox.com/2e/c7/HdGIL4F8_o.png" alt="" title="image of terminal"><br>
Most themes have a Ruby configure file already, but if you run into this issue simply create one. We will do this through the terminal, but a note editor works the same if you save it in the folder as <strong>Gemfile</strong></p>
<ul>
<li><em>create the file</em><br>
<code>nano Gemfile</code></li>
<li><em>paste the following configurations</em></li>
</ul>
<hr>
<pre class=" language-ruby"><code class="prism  language-ruby">	<span class="token comment"># Hello! This is where you manage which Jekyll version is used to run.</span>
	<span class="token comment"># When you want to use a different version, change it below, save the</span>
	<span class="token comment"># file and run `bundle install`. Run Jekyll with `bundle exec`, like so:</span>
	<span class="token comment">#</span>
	<span class="token comment">#     bundle exec jekyll serve</span>
	<span class="token comment">#</span>
	<span class="token comment"># This will help ensure the proper Jekyll version is running.</span>
	<span class="token comment"># Happy Jekylling!</span>
	gem <span class="token string">"jekyll"</span><span class="token punctuation">,</span> <span class="token string">"~&gt; 4.1.1"</span>
	<span class="token comment"># This is the default theme for new Jekyll sites. You may change this to anything you like.</span>
	gem <span class="token string">"minima"</span><span class="token punctuation">,</span> <span class="token string">"~&gt; 2.5"</span>
	<span class="token comment"># If you want to use GitHub Pages, remove the "gem "jekyll"" above and</span>
	<span class="token comment"># uncomment the line below. To upgrade, run `bundle update github-pages`.</span>
	<span class="token comment"># gem "github-pages", group: :jekyll_plugins</span>
	<span class="token comment"># If you have any plugins, put them here!</span>
	group <span class="token symbol">:jekyll_plugins</span> <span class="token keyword">do</span>
	  gem <span class="token string">"jekyll-feed"</span><span class="token punctuation">,</span> <span class="token string">"~&gt; 0.12"</span>
	<span class="token keyword">end</span>

	<span class="token comment"># Windows and JRuby does not include zoneinfo files, so bundle the tzinfo-data gem</span>
	<span class="token comment"># and associated library.</span>
	platforms <span class="token symbol">:mingw</span><span class="token punctuation">,</span> <span class="token symbol">:x64_mingw</span><span class="token punctuation">,</span> <span class="token symbol">:mswin</span><span class="token punctuation">,</span> <span class="token symbol">:jruby</span> <span class="token keyword">do</span>
	  gem <span class="token string">"tzinfo"</span><span class="token punctuation">,</span> <span class="token string">"~&gt; 1.2"</span>
	  gem <span class="token string">"tzinfo-data"</span>
	<span class="token keyword">end</span>

	<span class="token comment"># Performance-booster for watching directories on Windows</span>
	gem <span class="token string">"wdm"</span><span class="token punctuation">,</span> <span class="token string">"~&gt; 0.1.1"</span><span class="token punctuation">,</span> <span class="token symbol">:platforms</span> <span class="token operator">=</span><span class="token operator">&gt;</span> <span class="token punctuation">[</span><span class="token symbol">:mingw</span><span class="token punctuation">,</span> <span class="token symbol">:x64_mingw</span><span class="token punctuation">,</span> <span class="token symbol">:mswin</span><span class="token punctuation">]</span>
</code></pre>
<hr>
<ul>
<li>save the Gemfile<br>
<code>CTRL+x</code><br>
<code>Y</code><br>
<code>enter</code></li>
<li>Nice. Now jump back up and run both the bundle commands.</li>
</ul>
<h4 id="publishing-your-site">Publishing your site</h4>
<p>funky site you got there. Unfortunately, if you try and type in <a href="http://127.0.0.1:4000/">http://127.0.0.1:4000/</a> on your cell phone with your Wi-Fi off you’ll get nothing.</p>
<p>In the past this is the part where you’d have to shell out for a domain name, a webserver, and set up some sort of https service. Luckily, GitHub will circumvent the past.</p>
<h5 id="github-pages">GitHub Pages</h5>
<p>GitHub pages is a free service that allows you to host sites for free, but with certain limitations. Because our page is effectively a static site we won’t have to worry about those limitations, but we will need to alter our template before we can get it up and running.</p>
<blockquote>
<p>You could edit your site to match your information, but I found it less troublesome to get the site on GitHub pages first and then make your changes incrementally in case things go awry.</p>
</blockquote>
<h5 id="creating-the-repository">Creating the Repository</h5>
<ol>
<li>login to GitHub</li>
<li>make a new repository by clicking <em>New</em> <br> <img src="https://images2.imgbox.com/8d/c1/x2p6EiZR_o.png" alt=" " title="screenshot of code"></li>
<li>Name it what you’d like your site to be called (NOT the theme name)</li>
<li>confirm with the <em>Create repository</em> button</li>
</ol>
<h5 id="configuring-to-githubs-liking">Configuring to GitHub’s liking</h5>
<p>We need to change our Gemfile and our _config.yml file to satisfy these requirements.</p>
<ul>
<li><strong>Gemfile</strong><br>
using the terminal,<br>
<code>nano Gemfile</code><br>
comment out this line by adding a ‘#’ to the beginning<br>
<code>gem "jekyll"", "~&gt; 4.1.1"</code><br>
uncomment the following line by removing the ‘#’ from the beginning of the line<br>
<code>gem "github-pages", group jekyll_plugins</code><br>
exit and save<br>
<code>CTRL + x</code><br>
<code>y</code><br>
<code>enter</code><br>
cool onto</li>
</ul>
<p><strong>_config.yml</strong><br>
pop the following lines into the file where you please:</p>
<p><em>important: before pasting make sure your _config.yml does not already have any of these elements. if they do update them to reflect these values</em><br>
<strong>change “[ ]” to your values</strong></p>
<pre class=" language-ruby"><code class="prism  language-ruby">url<span class="token punctuation">:</span> <span class="token string">'https://[YOUR GITHUB USERNAME].github.io'</span> <span class="token comment"># or other github assigned domain</span>
baseurl<span class="token punctuation">:</span> <span class="token string">'/[YOUR GITHUB REPOSITORY NAME]'</span>
lsi<span class="token punctuation">:</span> <span class="token keyword">false</span>
safe<span class="token punctuation">:</span> <span class="token keyword">true</span>
source<span class="token punctuation">:</span>
incremental<span class="token punctuation">:</span> <span class="token keyword">false</span>
highlighter<span class="token punctuation">:</span> rouge
gist<span class="token punctuation">:</span>
  noscript<span class="token punctuation">:</span> <span class="token keyword">false</span>
kramdown<span class="token punctuation">:</span>
  math_engine<span class="token punctuation">:</span> mathjax
  syntax_highlighter<span class="token punctuation">:</span> rouge
</code></pre>
<p>Exit and save the file as we have before. Mine looks like this now<br>
<img src="https://images2.imgbox.com/fa/1d/wnkO57dk_o.png" alt="" title="Screenshot of code"><br>
<strong>pushing to the web</strong><br>
Almost Done. You got this.</p>
<ol>
<li>set your project to know what URL to send info to you can get this URL from your repository page<br>
<code>git remote set-url origin [YOUR REPOSITORY URL]</code></li>
<li>upload<br>
<code>git push origin</code></li>
<li>refreshing your GitHub repository page should now be populated with files. Jump to settings</li>
<li>Scroll down to the GitHub Pages section and select Master where the None dropdown is. Save.</li>
<li>This should generate a message and a link that looks like this.<br>
<img src="https://images2.imgbox.com/d3/12/lOhwkuPW_o.png" alt="" title="screenshot of GitHub Pages settings"><br>
Your site is ready to be published at <a href="https://calmcoconut.github.io/test/">https://calmcoconut.github.io/test/</a>.</li>
<li>follow the link and try it out on your cellphone</li>
</ol>
<h4 id="editing-the-theme-for-your-purpose">editing the theme for your purpose</h4>
<p>I highly recommend the tutorials offered by <a href="%5Bhttps://learn.cloudcannon.com/%5D(https://learn.cloudcannon.com/)">CloudCannon</a> on Jekyll. They have included both video and written formats. The cover most use cases. Follow <a href="https://learn.cloudcannon.com/jekyll/introduction-to-blogging">this link</a> for the blogging setup tutorial.</p>
<h4 id="common-problems">Common Problems</h4>
<p><strong>I am greeted with a 404 error when I click the link</strong><br>
something has gone wrong either with your local Gemfile or _config.yml file OR you have not uploaded to GitHub.</p>
<ul>
<li>redo the <em>Configuring to GitHub’s liking</em> section then reupload to github by issuing the following commands in the terminal.<br>
<code>git remote set-url origin [YOUR REPOSITORY URL]</code><br>
<code>git add .</code><br>
<code>git commit</code> (write any message and hit enter after running this)<br>
<code>git push origin</code></li>
</ul>
<p><strong>The site loads but it has no images or looks like a 90’s website</strong><br>
Very annoying problem caused by how the CSS and images are referenced. if you know anything about HTML it is a simple fix. Otherwise try the following:</p>
<ul>
<li>open the _includes folder in your project</li>
<li>find the head.html file</li>
<li>open and edit any <em>href</em> tag to start with the following<br>
<code>{{ site.baseurl }}</code><br>
instead of absolute paths. for example:<br>
<code>&lt;link rel="stylesheet" href="{{ site.baseurl }}/assets/css/style.css" /</code></li>
<li>save but do not exit. push your changes by running the following commands<br>
<code>git add .</code><br>
<code>git commit</code> (write any message and hit enter after running this)<br>
<code>git push origin</code></li>
<li>clear your browser history and refresh your website (this is to clear the cache).</li>
</ul>

