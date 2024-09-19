---
layout: page
title: vcmi-gym
description: An AI for the game of "Heroes of Might and Magic III"
img: assets/img/vcmi-gym/cover.png
importance: 1
category: AI
related_publications: false
---

You must have heard about
[Heroes of Might and Magic III](https://en.wikipedia.org/wiki/Heroes_of_Might_and_Magic_III)
\- a game about **strategy** and **tactics** where you gather resources, build
cities, manage armies, explore the map and fight battles in an effort to defeat
your opponents. The game is simply awesome and has earned a very special place
in my heart.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/h3-adventure.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/h3-battle.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/h3-town.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

<div class="caption">
    Ah, just looking at these images makes me want to <i>install the game
    right now!</i><br>If you know, you know :)
</div>

Released back in 1999, it's still praised by a huge community of fans that
keeps creating new game content, expansion sets, gameplay mods, HD remakes and
whatnot. That's where [VCMI](https://vcmi.eu/) comes in: a fan-made
**open-source recreation** of HOMM3's engine ❤️ As soon as I heard about it,
my eyes sparkled and I knew what my next project was going to be: an AI for
HOMM3. 

### Problem Statement

The game features scripted AI opponents which are not good at playing the
game and are no match for an experienced human player. To compensate for that,
the AI is _cheating_ - i.e. starts with more resources, higher-quality fighting
units, fully revealed adventure map, etc. Pretty lame.

### Objective

Create a non-cheating AI that is better at playing the game.

### Proposed Solution

Transform VCMI into a reinforcement learning environment and forge an AI which
meets the objective.

Contribute to the VCMI project by submitting the pre-trained AI model along
with a minimal set of code changes needed for adding an option to enable it
via the UI.

### Approach

Given that the game consists of several distinct player perspectives (combat,
adventure map, town and hero management), training separate AI models for each
of them, starting with the simplest one, seems like a good approach.

##### Phase 1: Preparation

1. Explore VCMI's codebase
* gather available documentation
* read, set-up project locally & debug
* if needed, reach out to VCMI's maintainers
* document as much as possible along the way
1. Research how to interact with VCMI (C++) from the RL env (Python)
* best-case scenario: load C++ libraries into Python and call C++ functions
directly
* fallback scenario: launch C++ binaries as Python sub-processes and use
inter-process communication mechanisms to simulate function calls

##### Phase 2: Battle-only AI

1. Create a VCMI battle-only RL environment
* follow the Farama Gymnasium (ex. OpenAI Gym) API standard
* optimise VCMI w.r.t. performance (e.g. no UI, fast restarts, etc.)
1. Train a battle-only AI model
* observation design: find the optimal amount of data to extract for at each
timestep
* reward design: find the optimal reward (or punishment) at each timestep
* train/test data: generate a large and diverse data set (maps, army
compositions) to prevent overfitting.
* start by training against the VCMI scripted AI, then gradually introduce
self-training by training vs older versions of the model itself. Optionally,
develop a MARL (multi-agent RL) where two two agents are trained concurrently.
* observability: use W&B and Tensorboard to monitor the training performance
1. Bundle the pre-trained model into a VCMI mod called "MMAI" which replaces
VCMI's default battle AI
1. Contribute to the VCMI project by submitting the MMAI plugin along with
the minimal set of changes to the VCMI core needed by the plugin
1. Contribute to the Gymnasium project by submitting vcmi-gym as an official
third-party RL environment

##### Phase 3: Adventure-only AI

Worthy of a separate project on its own, training an Adventure AI is out of
scope for now. A detailed action plan is not yet required.

## Dev log

I will be outlining parts of the project's development lifecycle, focusing on
those that seemed most impactful.

Since I started this project back in 2023, there will be features in VCMI
(and vcmi-gym) that were either introduced, changed or removed since then, as
both are actively evolving. Still, most of what is written here should be
pretty much accurate for at least a few years time.

#### Setting up VCMI

First things first - I needed to start VCMI locally in debug mode.
Thankfully, the VCMI devs have provided a nice
[guide](https://github.com/vcmi/vcmi/blob/develop/docs/developers/Building_macOS.md)
for that. Some extra steps were needed in my case (most notably due to Qt
installation errors), for which I decide to prepare a step-by-step vcmi-gym
[setup guide](https://github.com/smanolloff/vcmi-gym?tab=readme-ov-file#installation)
in the project's official git page.  the installation notes below:

Except for a few hiccups, the process of setting up VCMI went smooth. It was
educational and gave me some basic, but useful knowledge:
* CMake is a tool for compiling many C++ source files with a single cmake
command. A must for any project consisting of more than a few source files.
* `conan` is like `pip` for C++
* Debugging C++ code can be done in many different ways, so I made sure to
experiment with a few of them:
    * `lldb` can be used directly as a command-line debugging tool. I feel
    quite comfortable with CLIs and I looked forward to using this one, but
    the learning curve was a bit steep for me, so opted for a GUI this time.
    * Sublime Text's C++ debugger was a disappointment. I am a **huge**
    fan of ST and consider it the best text editor out there, but it's simply
    not good for debugging.
    * VSCode's debugger really saved the day. Has some glitches, but is really
    easy to work with. I will always prefer ST over VSC, but I do have it
    installed at all times, just for its debugger capabilities.
    * Xcode did not work well. VCMI is not a project that does not follow many
    Xcode conventions (naming, file/directory structure, etc.) which made it
    hard to simply navigate through the codebase. Well, IDEs have never felt
    comfortable anyway, so there was no need to waste my time further here.
* C++ language feature support (completions, linting, navigation, etc.) in
Sublime Text 4 is provided by the
[LSP-clangd](https://github.com/sublimelsp/LSP-clangd) package and is
*awesome*. I found it vastly superior to VSCode's buggy C++ extension.

Unfortunately, VCMI's dev setup guide was like a nice welcome-drink on a party
where nothing else is included. That's to say, there was no useful
documentation for me beyond that point. No surprises here - I've worked on
enough projects where keeping it all documented is a *hopeless* endeavor, so I
don't blame anyone. My hope is that the code is well-structured and easy to
understand. Good luck with that - the codebase is over 300K lines of C++ code.

#### So... how does it work?

Having it up & running, it was time to delve into the nitty-gritty of the
VCMI internals and start connecting the dots.

##### VCMI's client-server communication protocol

The big picture is a classic client-server model with a single server
(owner of the global game state) and many clients (user interfaces).

Communication is achieved via TCP where the application data packets are
serialized versions of `CPack` objects, for example:

<div class="row">
    <div class="col-sm-3 offset-sm-2 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-newgame-sequence.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm-5 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-makeaction-sequence.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

<i>Note: the term "Lobby" in the diagrams refers to the game's Main Menu
    (in this case - "New Game" screen) and should not be confused with VCMI's
    lobby component for online multiplayer.</i>

`MakeAction`, `StartAction`, etc. are sub-classes of the `CPack` base class -- since C++ is a strongly typed
language, there's a separate class object for each different data structure:

<div class="row">
    <div class="col-sm-4 offset-sm-4 mt-4 offset-mt-4 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-cpack-wbs.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    The <code>CPack</code> class tree (SVG version <a href="{{ 'assets/img/vcmi-gym/diagram-cpack-wbs.svg' | relative_url }}" target="_blank">here</a>)
</div>

Whenever I have to deal with a proprietary network communication protocol
which I am not familiar with, I tend to examine the raw data sent over the wire
to make sure I am not missing anything. So I sniffed a couple of TCP packets
using Wireshark and here's what the raw data looks like:

    == MakeAction command packet. Format:
    ==
    == [32-bit hex dump] // [value in debugger] // [dtype] // [field desc]

    01           // \x01  ui8   hlp (true, i.e. not null)
    FA 00        // 250   ui16  tid (typeid)
    00           // \0    ui8   playerColor
    29 00 00 00  // 41    si32  requestID
    00           // 0     ui8   side
    00 00 00 00  // 0     ui32  stackNumber
    02 00 00 00  // 2     si32  actionType
    FF FF FF FF  // -1    si32  actionSubtype
    01 00 00 00  // 1     si32  length of (unitValue, hexValue) tuples
    18 FC FF FF  // -1000 si32  unitValue (INVALID_UNIT_ID)
    45 00        // 69    si16  hexValue.hex

The observed hex dump aligns with (parts) of the object information displayed
in the debugger, as well the class declarations for
[`MakeAction`](https://github.com/vcmi/vcmi/blob/1.3.2/lib/NetPacks.h#L2500),
its member variable of type
[`BattleAction`](https://github.com/vcmi/vcmi/blob/1.3.2/lib/battle/BattleAction.h#L24)
field and its parent
[`CPackForServer`](https://github.com/vcmi/vcmi/blob/1.3.2/lib/NetPacksBase.h#L95).
The communication protocol between the server and the clients is now clear.

However, the data itself does not tell much about the system's behaviour.
There's a lot going on after that data is received -- let's see what.

##### Data processing

Any packet that is accepted by a client or server essentially spins a bunch of
gears which ultimately change the global game state and, optionally, result in
other data packets being sent in response. 

Figuring out the details by navigating through the VCMI codebase is nearly
impossible with the naked eye -- there are ~300K lines of code in there. That's
where the debugger really comes in handy -- with it, I followed the code path
of the received data from start to end and mapped out the important processing
components involved.
Digging deeper into the example above, I visualized the handling of a
`LobbyClientConnected` packet from two different perspectives in an attempt to
get a grip on what's going on:

<div class="row">
    <div class="col-sm-2 offset-sm-1 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-lobbyclientconnected-activity.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm-8 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-lobbyclientconnected-routing.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

<div class="caption">
    <code>LobbyClientConnected</code> server packet handling (SVG versions
    <a href="{{ 'assets/img/vcmi-gym/diagram-lobbyclientconnected-activity.svg' | relative_url }}" target="_blank">here</a>
    and
    <a href="{{ 'assets/img/vcmi-gym/diagram-lobbyclientconnected-routing.svg' | relative_url }}" target="_blank">here</a>)
</div>

That's the "short" version, anyway -- many irrelevant details and function
calls are omitted from the diagrams to keep it readable. But it's just one of
many possible codepaths, considering the number of different packets (see the
`CPack` class tree above). It would be impossible to map them all, but I did
map few more as I kept exploring the codebase -- I am sharing them here as
they might come in handy in the future:

<div class="row">
    <div class="col-sm-4 offset-sm-1 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-heromoved-routing.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm-2 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-playerblocked-routing.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm-4 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-makeaction-routing.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

<div class="caption">
    More packet routing diagrams (SVG versions:
    <a href="{{ 'assets/img/vcmi-gym/diagram-heromoved-routing.svg' | relative_url }}" target="_blank">here</a>,
    <a href="{{ 'assets/img/vcmi-gym/diagram-playerblocked-routing.svg' | relative_url }}" target="_blank">here</a>
    and
    <a href="{{ 'assets/img/vcmi-gym/diagram-makeaction-routing.svg' | relative_url }}" target="_blank">here</a>)
</div>

Patterns of the processing logic began to emerge at that point, meaning I had
reached a satisfactory level of general understanding about how VCMI works.
It was time to think about transforming it into a reinforcement learning
environment.

#### Optimizing VCMI for RL

VCMI's user-oriented design makes it unsuitable for training AI models
efficiently. On-policy RL algorithms like PPO are designed to operate in
environments where state observations can collected at high speeds and training
a battle AI is a process that will involve a _lot_ of battles being played.
We are talking millions here. 

##### Quick battles

With the animation speed set to max and auto-combat enabled, a typical 10 round
battle takes around a minute.
[_Ain't nobody got time for that_](https://www.youtube.com/watch?v=hV_2Q-sjYOA).

The game features a "quick combat" setting which causes battles to be carried
out in the background without any user interaction (the user's troops are
controlled by the computer instead). With quick combat enabled, a battle gets
resolved in under a second, which is a great improvement. Clearly,
combat **training should be conducted in the form of quick combats**.

But what good is a sub-second combat if it takes 10+ seconds to restart?

##### Quick restarts

Fortunately, VCMI features the potentially helpful "quick combat replays"
setting. Sadly, it allows only a _single manual replay_ per battle and only
when the enemy is a neutral army - not particularly useful in my case.
What I need is _infinite quick replays_.

A deeper look into VCMI's internals reveals the query stack, where each item
roughly corresponds to an event whose outcome depends on other events which
might occur in the meantime. When the player chooses to restart combat, the
results from battle query #2 are not applied and the entire query is
re-inserted back in the stack (with a few special flags set).

<div class="row">
    <div class="col-sm-7 offset-sm-1 mt-7 offset-mt-1 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/querystack.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm-3 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-replaybattle-sequence.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    The VCMI query stack and a communication diagram for (re-)starting combat (SVG
    <a href="{{ 'assets/img/vcmi-gym/diagram-replaybattle-sequence.svg' | relative_url }}" target="_blank">here</a>)
</div>

Removing the restart battle restrictions involved relatively minor code changes
and even revealed a small
[memory leak](https://github.com/vcmi/vcmi/issues/953#issuecomment-1787151606)
in VCMI itself (at least for VCMI v1.3.2, it should already be fixed in v1.4+)

##### Benchmarks

My poor man's benchmark setup consists of a simple 2-player micro adventure map
(2x2) where two opposing armies of similar strength (heroes with 7 groups of
units each) engage in a battle which is restarted immediately after it ends:

<div class="row justify-content-md-center">
    <div class="col-sm-8 mt-8 offset-mt-2 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/testmap-layout.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    A very simple map for testing purposes
</div>

The benchmark was done on my own laptop (M2 Macbook Pro). Here are the
measurements:
* 16.28 battles per per second
* 862 actions per second (431 per side)

The results were good enough for me - there was no need to optimize VCMI
further at this point. It was about time I started thinking on how to integrate
it with the Python environment.

#### Embedding VCMI

The [Farama Gymnasium](https://gymnasium.farama.org/) (formerly OpenAI Gym) API
standard is a Python library that aims to make representing RL problems easier.
I like it because of its simplicity and wide adoption rate within the python RL
community (RLlib, StableBaselines, CleanRL are a few examples), so I going to
use it for my RL environment.

Communicating with a C++ program (i.e. VCMI) from a Python program was a new
and exciting challenge for me. Given that the Python interpreter itself is
written in C++, it had to be possible. I googled a bit and decided to go with
[pybind11](https://pybind11.readthedocs.io/en/stable/), which looked like the
tool for the job.

I quickly ran into various issues related to memory violations. Anyone that
has worked with data pointers (inevitable in C++) has certainly encountered
the infamous _Undefined Behaviour™_ monster that can make a serious mess
out of any program. Turns out there is a very strict line one must not cross when
embedding C++ in Python: accessing data outside of a python thread without
having acquired the Global Interpreter Lock (GIL). A Python developer never
really needs to think about it until they step out of Python Wonderland and
enter the dark dungeons of a C++ extension. I managed to eventually get the
hang of it and successfully integrated both programs. A truly educational
experience.

While experimenting with pybind11, I was surprised to find out VCMI can't really be
*embedded* as it refuses to boot in a non-main thread. Definitely a blocker,
since the main thread during training is the RL script, not VCMI. Bummer.

A quick investigation revealed that the [SDL](https://www.libsdl.org/) loop
which renders the graphical user interface (GUI) was responsible for the issue.
This GUI had to go.

##### Removing the GUI

There have always been many reasons to remove the GUI -- it is not used during
training, consumes additional hardware resources and enforces a limit on the
overall game speed due to hard-coded framerate restrictions, so I was more than
happy to deal with it now that it became necessary.

The VCMI executable accepts a `--headless` flag which causes a runtime
error as soon as the game is started. Still, the codebase did contain code
paths for running in such a mode, so making it work properly should be an
easy win. In the end, I decided to introduce a new build target which defines
a function which only _initializes_ the SDL (this is required for the game to
run) and another function which starts the game but _without_ activating the
SDL render loop.

However, with no GUI, it was hard to see what's going on, so I ended up coding
a text-based renderer which is pretty useful for visualizing battlefield state
in the terminal:

<div class="row">
    <div class="col">
        {% include figure.liquid path="assets/img/vcmi-gym/h3-ansi.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    My ANSI text renderer for VCMI \o/
</div>

After pleasing the eye with such a result, it was time to get back to the
VCMI-Python integration with pybind11.

##### Connecting the pieces

I refrained from the quick-and-dirty approach even for PoC purposes as it meant
polluting with pybind11 code and dependencies all over the place. A separate
component had to be designed for the purpose.

Typically, connecting two components with incompatible interfaces involves
an adapter (I call it _connector_) which provides a clean API to each of the
components:

<div class="row justify-content-md-center">
    <div class="col-sm-3 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-povgym-sequence.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm-4 mt-4">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-povconnector-components.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm-3 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-povvcmi-sequence.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

When applying the
[adapter pattern](https://refactoring.guru/design-patterns/adapter)
one must flip their perspective from the local viewpoint of an object in a
relationship, to the shared viewpoint of the relationship itself (i.e. both
sides of our connector). That's when one issue becomes apparent: both
components are controlled by _different_ entities - i.e. the VCMI client
receives input from the VCMI Server, while the gym env receives input from the
RL algorithm.

<div class="row justify-content-md-center">
    <div class="col-sm-8">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-povconnector-sequence.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    A view on the vcmi-gym relationships through the connector
</div>

Since both controlling entities (RL script and VCMI server) are otherwise
unrelated, the _connector_ is responsible for ensuring that they operate in a
mutually synchronous manner. The solution involves usage of synchronization
primitives to block the execution of one thread while the other is unblocked:

<div class="row justify-content-md-center">
    <div class="col-sm-3 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-connector-init-sequence.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm-3 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-connector-step-sequence.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm-3 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-connector-reset-endbattle-sequence.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm-3 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-connector-reset-midbattle-sequence.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Connector implementation details (SVG versions
    <a href="{{ 'assets/img/vcmi-gym/diagram-connector-init-sequence.svg' | relative_url }}" target="_blank">here</a>,
    <a href="{{ 'assets/img/vcmi-gym/diagram-connector-step-sequence.svg' | relative_url }}" target="_blank">here</a>
    <a href="{{ 'assets/img/vcmi-gym/diagram-connector-reset-endbattle-sequence.svg' | relative_url }}" target="_blank">here</a>
    and
    <a href="{{ 'assets/img/vcmi-gym/diagram-connector-reset-midbattle-sequence.svg' | relative_url }}" target="_blank">here</a>)
</div>

Some notes regarding the diagrams above:
* The gray background denotes a group of actors operating within the same
  thread (where `T1`, `T2`, ... are the threads). The same actor can operate
  in multiple threads.
* The meaning behind the color-coded labels is as follows:
    * <span style="background-color: yellow; color: black">acquire lock</span>:
      a successful attempt to acquire the shared lock. The can be released
      explicitly via
      <span style="background-color: black; color: yellow">release lock</span>
      or implicitly at the end of the current call block.
    * <span style="background-color: yellow; color: red">acquire lock</span>:
      an unsuccessful attempt to acquire the shared lock, effectively blocking
      the current thread execution until the lock is released.
    * <span style="background-color: red; color: black">cond.wait</span>: the
      current thread execution is blocked until another thread notifies it via
      <span style="color: blue">cond.notify</span> (`cond` is a
      [conditional variable](https://en.cppreference.com/w/cpp/thread/condition_variable)).
    * <span style="color: gray">P_Result</span> and <span style="color: gray">Action</span>:
      shared variables modified by reference (affecting both threads)
* The red bars indicate that the thread execution is blocked.
* `AAI` and `BAI` are the names of my C++ classes which implement VCMI's
  `CAdventureAI` and `CBattleGameInterface` interfaces. Each VCMI AI (even the
  default scripted one) defines such classes.
* `baggage` is a special struct which contains a reference to the `GetAction`
  function. I introduced the Baggage idiom in VCMI to enable
  [dependency injection](https://en.wikipedia.org/wiki/Dependency_injection) -
  specifically, the Baggage struct is seen as a simple `std::any` object by
  upstream code, all the way up until `AAI` where it's converted back to a
  Baggage struct and the function references stored within are extracted. A lot
  of it feels like _black magic_ and implementing it was a real challenge
  (function pointers in C++ are really weird).
* at the end of a battle, a special flag is returned with the result
which indicates that the next action must be `reset`
* in the middle of a battle, a `reset` is still a valid action which is
effectively translated to _retreat_ + an a "yes" answer to the "Restart battle"
dialog

With that, the important parts of the VCMI-gym integration were now in place.
There were many other changes which I won't discuss here, such as
dynamic TCP port allocation, logging improvements, fixes for race conditions
when starting multiple VCMIs, building and loading it as a single shared
dynamic library, etc. My hands already itched to work on the actual RL part
which was just over the corner.

### Renforcement Learning

This is the part I found the most difficult. While there are well-known popular
RL algos out there, it's not a simple matter of _plug&play_ (or
_plug&train_ :)) It's a lengthy process involving a cycle of of research,
imeplentation, deployment, observation and analysis. It's why I am always
taken aback by my friends' reactions when telling them about this project:

"The AI algorithms have already been developed, what takes you so long?"

There's so much I have to say here, but most often, I prefer to avoid
talking for another hour about it, so I usually pick an answer as short as
"Trust me, it's not". And it's not a good answer, I know that. Call it bad
marketing - not just my answer, about this project, but the ubiquitous hype
around AI that has made people thinking <i>"That's it, humanity has found the
_formula for AI_. Now it's all about having a good hardware"</i>. Well, if that
were the case, I wouldn't bother with this article in the first place. If you
are interested in the long answer, read ahead.

#### The RL cycle

There's plenty of information about RL on the web, but I will outline the most
essential part it: the action-steate-reward cycle which nicely fits into this
simple diagram:

<div class="row justify-content-md-center">
    <div class="col-sm-8">
        {% include figure.liquid path="assets/img/vcmi-gym/rl-diagram.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

So far I had prepared VCMI as an RL environment, but that's just one key
piece. Next up is presenting its state to the agent.

##### 👁️ Observations

Figuring out which parts of the environment state should be "observable" by the
agent (i.e. the observation space) is a balance between providing enough,
yet not too much information.

I prefer the [Empathic design](https://en.wikipedia.org/wiki/Empathic_design)
approch when dealing with such a problem, trying to imagine myself playing the
game (and, if possible, actually play it) with very limited information
about its current state, taking notes of what's missing and how important is
it. For example, playing a game of Chess without seeing the pieces that have
been taken out, or without seeing the enemy's remaining time is OK, but things
get rough if I can't distinguish the different types of pieces, for example.

Since the agent's observation space is just a bunch of numbers organized in
vectors, it would be nearly impossible for me to interpret it directly --
rather, I apply certain post-processing to the observation and transform it
into something that my brain can use (yes, that is a sloppy way to describe
"user interface"). The important part is this: all information I get to see is
simply a projection of the information the agent gets to see.

The observation space went through several design iterations, but I will only
focus on the latest one.

The mandatory component of the observation, the "chess board" equivalent here
is the battlefield's terrain layout. I started out by enumerating all relevant
battle hexes that would represent the basis of the observation.
The enumeration looks similar to the one used by VCMI's code, but is
different.

<div class="row justify-content-md-center">
    <div class="col-sm-8">
        {% include figure.liquid path="assets/img/vcmi-gym/hexes.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

Each hex can be in exactly one of four states w.r.t. the currently active unit:

1. terrain obstacle
1. occupied by a unit
1. free (unreachable)
1. free (reachable)

This state is represented by a single number. In addition, there are 15 more
numbers which represent the occupying creature's attirbutes, similar to what
the player would see when right-clicking on the creature: owner, quantity,
creature type, attack, defence, etc.

<div class="row justify-content-md-center">
    <div class="col-sm-4">
        {% include figure.liquid path="assets/img/vcmi-gym/h3-lizardmen.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm-5">
        {% include figure.liquid path="assets/img/vcmi-gym/table-observationspace.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

No information about the terrain's type (grass, snow, etc.) as well as the
creature's morale, luck, abilities and status effects is provided to the agent.
A cardinal sin of RL environment design is to ignore the
[Markov property](https://en.wikipedia.org/wiki/Markov_property), whereby
RL algorithms would struggle to optimize the policies, so it was important to
not simply hide those attributes, but take them out of the equation:

* terrain is always "cursed ground" (negates morale and luck)
* heroes have no spell books as well as no spellcasting units in their army
* heroes have no passive skills or artifacts affecting the units' stats

The observation space could be expanded and the restrictions - removed as soon
as the agent learns to play well enough.

<i>Note: this is already the case, and additional info was eventually added to
the observation: morale, luck, a subset of the creature abilities, total army
strength, etc.</i>

##### 🕹️ Actions

Designing the action space is definitely simpler as the agent should be able to
perform any action as long as it's possible under certain conditions. The only
meaningful restrictions here are those that prevent quitting, retreating and
(as discussed earlier) spell casting.

The total number of possible actions then becomes **2312**, which is a sum of:
* 1 "Defend" action
* 1 "Wait" action
* 165 "Move" actions (1 per hex)
* 165 "Ranged attack" actions (1 per hex)
* 165\*12=1320 "Melee attack" actions (12 per hex - see image below)

<div class="row justify-content-md-center">
    <div class="col-sm-3">
        {% include figure.liquid path="assets/img/vcmi-gym/h3-attack-hexes-1.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm-4">
        {% include figure.liquid path="assets/img/vcmi-gym/h3-attack-hexes-2.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm-4">
        {% include figure.liquid path="assets/img/vcmi-gym/h3-attack-hexes-3.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    The 12 melee attacks per hex (6 to 11 are available to 2-hex attackers only)
</div>

The fact is, most of those actions are only _conditionally available_ at the
current timestep. For example, the 1652 actions are reduced to around 600 if
the active unit has a speed of `5`, as it simply can't reach most of the hexes.
If there are also no enemy units it can target, that number is further
reduced to ~200 as the "melee attack" actions become unavailable. If it's a
melee unit, the "ranged attack" actions also become unavailable, reducing the
possible actions to around 50 -- _orders of magnitute_ lower.

Having such a small fraction of valid actions could hinder the initial stage
of the learning process, as the agent will be unlikely to select those actions.
Introducing action masking can help with this problem -- more on that later.

##### 🍩 Rewards

Arguably the hardest part is deciding when and how much to reward (or punish)
agents for their actions. Sparse rewards, i.e. rewards only at the end of the
episode, or battle, may lead to (much) slower learning, while too specific rewards
(at every step, based on the particular action taken) may induce too much bias,
ultimately preventing the agent from developing strategies which the reward
designer did not account for.

The reward can be expressed as:

$$
R = \sum_{i=1}^nS_i(5D_{i} - V_i\Delta{Q_i})
$$

where:
* **R** is the reward
* **n** is the number of stacks on the battlefield
* **S<sub>i</sub>** is `1` if the stack is friendly, `-1` otherwise
* **D<sub>i</sub>** is the damage dealt by the stack
* **V<sub>i</sub>** is the stack's [AI Value](https://heroes.thelazy.net/index.php/List_of_creatures)
* **ΔQ<sub>i</sub>** is the change in the stack's quantity (number of creatures)

And a (simpler) alternative to the mathematical formulation above:

```
R = 0
for stack in all_stacks:
    points = 5 * stack.dmg_dealt - (stack.ai_value * stack.qty_diff)
    sign = stack.is_friendly ? 1 : -1
    R += sign * points
```

The bottom line is: all rewards are zero-sum, i.e. for each reward point given
to one side, a corresponding punishment point is given to the other side.

An important note here is that there's no punishment for invalid actions
(or _conditionally unavailable_ actions) -- the initial reward design did
include such, but it became redundant after I added action masking (see next
section).

<i>Note: this reward function became more complex as the project evolved and
eventually included damping factors, fixed per-step rewards, scaling based on
total starting army value, etc. An essential part of it still corresponds to
the above formula, though.</i>

#### 🏋️ Training algorithm

I started off with [stable-baselines3](https://github.com/DLR-RM/stable-baselines3)'s
PPO and DQN implementations, which I have used in the past, and launched a
training session where the left-side army is controlled by the agent and
the enemy (right-side army) is controlled by the built-in "StupidAI" bot:

<div class="row justify-content-md-center">
    <div class="col-sm-6">
        {% include figure.liquid path="assets/img/vcmi-gym/rl-battle-simple.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

The idea was to eventually add more units to each army which would progressively
increase the complexity.

However, one issue quickly popped up: the action space
was too big (2000+ actions), while the average number of _allowed_ actions at
any given timestep was less than 50. It means an untrained agent has only 2%
chance to make an valid action (the initial policy is basically an RNG).
The agent was making too many invalid actions and, although it eventually
learned to stop making them, it still performed very poorly: 

<div class="row justify-content-md-center">
    <div class="col-sm-11">
        {% include figure.liquid path="assets/img/vcmi-gym/rl-invalid-action-issue-1.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

<div class="caption">
    The number of invalid actions ("errors") decreases, but the success rate (games won) stays at 0.
</div>

Something was clearly wrong here. Why was the agent unable to win a game?
Clearly it _was learning_: the `errors` chart shows it eventually stops making
invalid actions. I needed more information.

I started reporting aggregated metrics with the actions being taken and
visualised them as a heatmap (had to write a custom
[vega](https://vega.github.io/vega/) chart in W&B for that).
The problem was revealed immediately: the agent's policy was converging to
a single action:

<div class="row justify-content-md-center">
    <div class="col-sm-11">
        {% include figure.liquid path="assets/img/vcmi-gym/rl-invalid-action-issue-2.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

<div class="caption">
    Heatmaps of the agent's attempted actions throughout the training session.
    The agent learns to make only "Defend" actions. W&B link
    <a href="https://wandb.ai/s-manolloff/vcmi/groups/M2-PPO-20231127_192222/workspace?nw=nwusersmanolloff">here</a>).
</div>

Apparently, all the agent "learned" was that any action except the "Defend"
action results in a negative reward (recall that 98% of the actions are invalid
at any given timestep). While it does yield a higher reward, it is still
a poor strategy that will always lead to a loss. This is referred to as
_local minima_ and such a state is usually nearly impossible to recover from.

One option was to try and tweak the negative feedback for invalid actions.
Making it too small or completely removing it caused another local minima:
convergence into a policy where only invalid actions were taken, as the episode
never finished and thus - the enemy could never inflict any damage (the enemy
is not given a turn until the agent finishes its own turn by making a valid
move). Maybe I should introduce a negative feedback on "Defend" actions...? 
That would introduce too much bias (defending is not an inherently *bad*
action, but the agent would perceive it as such).

Reshaping the reward signal was not productive here. I had to prevent such
actions from being taken in the first place. To do this, I needed to understand
how agents choose their actions:

<div class="row justify-content-md-center">
    <div class="col-sm-6">
        {% include figure.liquid path="assets/img/vcmi-gym/rl-softmax.jpeg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

1. The output layer of a neural network produces a group of `n` values
(called _logits_): `[s₁, s₂, ..., sₙ]`, where `n` is the number of actions.
The logits have no predefined range, i.e. `sᵢ ∈ (-∞, ∞)`.
1. A `softmax` opration forms a discrete _probability distribution_ `P`, i.e.
the values are transformed into `[p₁, p₂, ..., pₙ]` where `pᵢ ∈ [0, 1]` and
`sum(p₁, p₂, ..., pₙ) = 1`.
1. Depending on the policy, either of the following comes next:
    - Greedy policy: an `argmax(p₁, p₂, ..., pₙ)` operation (denoted as
    `max(pᵢ)` in the figure above) returns the _index_ `i` of the
    value `pᵢ = max(p₁, p₂, ..., pₙ)`, i.e. the action with the highest
    probability.
    - Stochastic policy: a `sample(p₁, p₂, ..., pₙ)` operation (not shown in
    the figure above) returns the _index_ `i` of a sampled value `pᵢ ~ P`.

Armed with that knowledge, it's clear that if the output logits are infinitely
small, the probability of their corresponding actions will be `0`. This is
called **action masking** and is exactly what I needed.

Action masking in PPO was already supported in stable-baselines3's
[contrib](https://github.com/Stable-Baselines-Team/stable-baselines3-contrib)
package, but was not readily available for any other algorithm. If I wanted
such a feature for, say, QRDQN, I was to implement it myself. This turned out
to be quite difficult in stable-baselines3, so I decided to search for other
RL algorithm implementations which would be more easily extensible. That's how
I found [cleanrl](https://github.com/vwxyzjn/cleanrl).

CleanRL is a true gem when it comes to python implementations of RL algorithms:
the the code is simple, concise, self-contained, easy to use and customize,
excellent for both practical and educational purposes. It made it easy for me
to add action masking to PPO and QRDQN (an RL algorithm which I implemented on
top of cleanrl's DQN). Prepending an "M" to those algos was my way of marking
them as augmented with action masking (MPPO, MQRDQN, etc).

A detailed analysis of the effects of action masking can be found in
this [paper](https://arxiv.org/pdf/2006.14171). I would also recommend
this [article](https://boring-guy.sh/posts/masking-rl/), which provides a nice
explanation and practical Python examples whih helped me along the way.

Here's how the action distribution looked like after action masking was implemented:

<div class="row justify-content-md-center">
    <div class="col-sm-11">
        {% include figure.liquid path="assets/img/vcmi-gym/rl-invalid-action-mask-result.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

<div class="caption">
    Results from a training session with MPPO (PPO with action masking). 
    W&B link <a href="https://wandb.ai/s-manolloff/vcmi/groups/M8-PBT-MPPO-20231206_113004/workspace?nw=nwusersmanolloff">here</a>.
</div>

The agent was no longer getting stuck in a single-action policy and was instead
making meaningful actions: shoot (labelled MOVE7 above) and other
attack actions, since all of them were now valid. The agent was now able to
decisively win this battle (80% winrate).

##### 🎛️ Hyperparameter optimization

The above results were all achieved with MPPO, however this wasn't as simple as
it may look. The algorithm has around 10 configurable parameters
(called _hyperparameters_), all of which needed adjustments until the desired
result was achieved.

Trying to find an optimal combination of hyperparameters is not an
easy task. Some of those _greatly_ influence the training process - turning the
knob by a hair can result in a completely different outcome. All RL algos have
those. While I've read that one can develop a pretty good intuition over the
years, there's certainly no way to be certain which combination of values works
best for the task -- there's no silver bullet here. It's a trial-and-error
process.

W&B [sweeps](https://docs.wandb.ai/guides/sweeps) are one way to do
hyperparameter tuning and I've successfully used them in previous RL
projects. The early stopping criteria helps save computational power that would
be otherwise wasted in poorly performing runs, but newly started runs need
to learn everything from scratch. There had to be a better way.

That's how I learned about the
[Population Based Training](https://deepmind.google/discover/blog/population-based-training-of-neural-networks/)
(PBT) method. It's essentially a hyperparameter tuning technique that _does
not periodically throw away your agent's progress_. While educating myself
on the topic, I stumbled upon the
[Population Based Bandits](https://www.anyscale.com/blog/population-based-bandits)
(PB2) method, which improves upon PBT by leveraging a probabilistic model for
selecting the hyperparameter values, so I went for it instead. 

<div class="row justify-content-md-center">
    <div class="col-sm-6">
        {% include figure.liquid path="assets/img/vcmi-gym/rl-pbt.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Illustration of three different approaches for hyperparameter tuning
    (source: original PBT paper).
    <br>At regular intervals, PBT (and PB2) will terminate lifelines of poorly
    performing agents and spawn clones of top-performing ones in their stead.
</div>

PB2 [certainly helped](https://wandb.ai/s-manolloff/vcmi/reports/Experimenting-with-PB2--Vmlldzo2NzI1ODc4),
but this seems mostly a result of its "natural selection" feature, rather than
hyperparameter tuning. In the end, a single policy was propagated to all agents
and the RL problem was solved, but huge ranges of hyperparameters remained
unexplored. Apart from that, PB2's bayesian optimization took took 20% of the
entire training iteration time (where 1 iteration was ~5 minutes), so I opted
for the vanilla PBT instead. I have used in all vcmi-gym experiments since and
basically all results published here are achieved with PBT.

<div class="row justify-content-md-center">
    <div class="col-sm-6">
        {% include figure.liquid path="assets/img/vcmi-gym/components-rl-optimizers.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Hyperparameter optimization in vcmi-gym
</div>

I must point out that the hyperparameter combination is not static throughought
the RL training. It _changes_. For example, in the early
stages of training, lower values for `gamma` and `gae_lambda` (PPO params)
result in faster learning, since the agent considers near-future rewards as more important
than far-future rewards. It makes perfect sense if we compare it to how we
(humans) learn: starting with the basics, gradually increasing the complexity and 
coming up with longer-term strategies as we become more familiar with our task.

<div class="row justify-content-md-center">
    <div class="col-sm-11">
        {% include figure.liquid path="assets/img/vcmi-gym/rl-pbt-gamma-example.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    PBT in action: best performance is achieved when `gamma` and `gae_lambda`
    start with a lower value, gradually increasing as the agent gains deeper
    understanding of the environment and is able to efficiently account for
    long-term rewards. W&B link <a href="https://wandb.ai/s-manolloff/vcmi-gym/groups/PBT-v4-pools-20240830_010954/workspace?nw=nwusersmanolloff">here</a>.
</div>

##### 📚 Datasets

Achieving an 80% winrate sounds good, but the truth is, the agent was far from
intelligent at that point. The obvious problem was that it could only win
battles of this (or very similar) type. A different setup (quantities, creature types,
stack numbers, etc.) would confuse the agent - the battle would look different
compared to everything it was trained for.
In other words, the did not generalize well. 

This is a typical problem in ML and can usually be resolved by ensuring the
data used for training is rich and diverse. In the context of vcmi-gym, the
"dataset" can be thought of:

1. Army compositions: creature types, number of stacks and stack quantities.
1. Battlefield terrains: terrain types, number and location of obstacles.
1. Enemy behaviour: actions the enemy takes in a given battle state.

Ensuring as much diversity as possible was a top priority now. The question was
_how_ to do it?

My initial attempt was to make use of Gym's concept for
[Vector environments](https://gymnasium.farama.org/api/experimental/vector/),
which allows to train on N different environments at once. This means the agent
would see N different datasets on each timestep which would provide some degree
of data diversity. The problem was that VCMI is designed such that only one
instance of the game can run at a time, I had to deal with that first
(later submitted it as a standalone [contribution](https://github.com/vcmi/vcmi/pull/4253)).

With vector environments, my agents had access to a more diverse dataset.
This, however, lead to (surprise) another problem: the system RAM became a
bottleneck, as all those VCMI instances running in parallel needed ~400MB each.
At about 30 VCMI instances, my gear (MacBook M2 pro) started to choke, which
meant that was the limit of different battle compositions I could use for training.
Turned out it's not enough -- the agent was still unable to generalize well. I
needed a _lot_ more than 30 armies.

I delved into the VCMI codebase again in search for a way to
dynamically change the armies on each restart. Here's the what the server-client
communication looks like when there's a battle:

<div class="row justify-content-md-center">
    <div class="col-sm-4">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-replaybattle-sequence-simplified.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    The VCMI server-client packet communication sequence at battle (re-)start
</div>

The `BattleStart` server packet is the culprit here. It contains stuff like
hero and army IDs, map tile, obstacles, etc. Typically, those don't change when
a battle is re-played, so I plugged in a server-side function which modifies
the packet before it gets sent, setting a pseudo-random tile, obstacle layout
and army ID. The thing is, the army ID must refer to an army (i.e. hero)
object already loaded in memory. In short, the army must already exist on the
map, but my test maps contained only two heroes.

Technically, it is possible to generate armies on-the-fly (before each battle),
but the problem is: those armies will be _imbalanced_ in terms of strength. This
will introduce unwanted noise during training, as agents will
often win (or lose) battles not because of their choice of actions, but simply
because the armies were vastly different in strength. Poor strategies may get
reinforced as they result in a victory which occurred only because the agent's
army had been too strong to begin with. The only way to ensure armies are
balanced is to generate, _test_ and _rebalance_ them beforehand, ensuring all
armies get equal chances of winning.

This meant I had to see how VCMI maps are generated, write my own map generator,
produce map with _lots_ of different armies and then test and rebalance it
until it was ready to be used as a training map. It was quite the effort and
ultimately resulted in an entire system comprised of several components:

<div class="row justify-content-md-center">
    <div class="col-sm-8">
        {% include figure.liquid path="assets/img/vcmi-gym/components-rl-mapgen.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    System for generating train (and test) data
</div>

The cycle goes like this:

1. Generate a map with many heroes (i.e. armies) of _roughly_ similar strength
2. Evaluate the map by collecting results for each army based on the battles lead by the built-in bot on both sides
3. Rebalance the map by adding/removing units from the armies based on aggregated results from 2.
4. Repeat step 2. and 3. until no further rebalancing is needed

Speaking in numbers, I have been using maps with 4096 heroes, which means there
are more than 16M unique parings, making it very unlikely that the agent
will ever train with the exact same army compositions twice. There's a catch
here: in HOMM3, there's no way to have 4096 heroes on the map at the same time
(the hero limit is 8). Fortunately, VCMI has no such limit, but imposes another
restriction: there can't be duplicate heroes on the map, and the base game
features less than 200 heroes in total. To make this possible, I had to create
a VCMI "mod" which adds each of those 4096 heroes as a separate hero type and
the issue was gone:

That partly solved the issue with the diverse training data. The only issue with
this approach was that all armies were of equal strength - for example, all armies
were corresponding to a mid-game army (60-90 in-game days). This meant that the
agent had less training experience with early-game (weaker) armies, as well as
late-game (stronger) armies. I later improved this map generator and added
the option to create `pools` of heroes, where all heroes within
a pool have equal strength, but heroes in different pools have different
stregths. Here is how one such map looks like:

<div class="row justify-content-md-center">
    <div class="col-sm-11">
        {% include figure.liquid path="assets/img/vcmi-gym/rl-testmap.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Procedurally generated map with 4096 unique hero armies organized into 4
    pools. Here, a hero with ID=85 that belongs to a pool of armies
    with total <a href="https://heroes.thelazy.net/index.php/AI_value">AI Value</a>
    of 10K (early-game army pool) is selected.
</div>

By training on those maps, agents were able to generalize well and maintain
steady performance across a wide variety of situations. Below are the
results achieved by an agent trained on a 4096-army map and then evaluated on
an unseen data set:

<div class="row justify-content-md-center">
    <div class="col-sm-11">
        {% include figure.liquid path="assets/img/vcmi-gym/rl-mapgen-results.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Agent evaluation results from simulated early-game (20K) and late-game (300K) battles
</div>

The dataset was unseen in the sense that it included armies of total strength
20K and 300K (neither can be found in the training dataset). The battle terrain
and obstacles were not exactly unseen, as there is a finite combination of
possible terrains and the agent had probably encountered them all before.
The enemy behaviour, however, was also new, since all training is done
vs. the scripted "StupidAI" bot, while half of the evaluation is done vs.
"BattleAI" (VCMI's strongest scripted bot).

Having said all this, I still haven't described how exactly I evaluate the
those models, so make sure to read the next section if you want to know more.

##### 🕵️ Testing (evaluation)

Evaluating the trained agents is a convenient way to determine if the training
is productive. A typical problem that occurs during training is overfitting:
the metrics collected during training are good, but the metrics collected
during testing are not.

At the time I was training my models on 3 different machines at home (poor
man's RL training cluster), each of which was exporting a new version of the
model being trained at regular intervals. I used W&B as a centralized storage
(they give you 100GB of storage on the free tier, which is amazing) for models
and and designed an evaluator which could work in a distributed manner
(i.e. in parallel with other evaluators on different machines), pulling stored
models, evaluating their performance and pushing the results. Here's how it
looks:

<div class="row justify-content-md-center">
    <div class="col-sm-8">
        {% include figure.liquid path="assets/img/vcmi-gym/components-rl-evaluators.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    System for evaluating trained models
</div>

At regular intervals, the hyperparam optimizer uploads W&B artifacts containing
trained models.
The evaluators download those models, load them and let them play against multiple types
of opponents (StupidAI and BattleAI - the two in-game scripted bots) on several
different maps which contain unseen army compositions. The results of those
battles are stored for visualisation and the models - marked as evaluated
(using W&B artifact tags) to prevent double evaluation.

##### 🧠 Neural Network

Along with the reward scaling, the thing I experimented the most with was
the architectures of the neural network. Various mixtures of
fully-connected (FC), convolutional (Conv1d, Conv2d), residual (ResNet),
recurrent (LSTM) and self-attention layers were used in this project with
varying success. In general, results for NNs which contained SelfAttention
and/or LSTM layers were simply worse, so I eventually stopped experimenting
with them. Similarly, batch normalization and dropout also seemed to do more
harm than good, so those were removed as well. 

<div class="row">
    <div class="col-sm">
        {% include figure.liquid path="assets/img/vcmi-gym/arch-fc.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm">
        {% include figure.liquid path="assets/img/vcmi-gym/arch-attention.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="row">
    <div class="col-sm">
        {% include figure.liquid path="assets/img/vcmi-gym/arch-heads.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="row">
    <div class="col-sm">
        {% include figure.liquid path="assets/img/vcmi-gym/arch-v4-lstm.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm">
        {% include figure.liquid path="assets/img/vcmi-gym/arch-v4-deep.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Some of the NN architectures used in vcmi-gym (there are way too many variations to visualize them all)
</div>

A slight modification of the NN shown in the last image above seems to perform
well and is currently used for training. The NN architecture is, however,
often being changed, so it's likely the diagrams above are already outdated.

.

.

.

<i>There's certainly more to this story, but I haven't had the time to write it
    all down yet, so stay tuned.</i>

**... to be continued.**
