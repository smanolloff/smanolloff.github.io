---
layout: page
title: vcmi-gym
description: An AI for the game of "Heroes of Might and Magic III"
img: assets/img/vcmi-gym/cover.png
importance: 1
category: AI
related_publications: false
---

/// XXX: decide on present or past tense, they're currently mixed up

You must have heard about
[Heroes of Might and Magic III](https://en.wikipedia.org/wiki/Heroes_of_Might_and_Magic_III)
- a game about **strategy** and **tactics** where you gather resources, build
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
my eyes sparkled and I knew what my next project was going to be.

### Problem Statement

The game features scripted AI opponents which are not good at playing the
game and are no match for an experienced human player. To compensate for that,
the AI is _cheating_ - ie. starts with more resources, higher-quality fighting
units, fully revealed adventure map, etc. Pretty lame.

### Objective

Create a non-cheating AI that is challenging even for advanced players.

### Proposed Solution

Transform VCMI into a reinforcement learning environment and forge an AI which
meets the objective.

Contribute to the VCMI project by submitting the pre-trained AI model along
with a minimal set of code changes needed for adding an option to enable it
via the UI.

### Approach

Given that the game consists of several distinct player perspectives (combat,
adventure map, town and hero management), training separate AI models for each
of them (starting with the simplest one) seems like a good approach.

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
* optimise VCMI w.r.t. performance (eg. no UI, fast restarts, etc.)
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

TBD

## Dev log

#### Setting up VCMI

First things first - I needed to start VCMI locally in debug mode.
Thankfully, the VCMI devs have provided a nice
[guide](https://github.com/vcmi/vcmi/blob/develop/docs/developers/Building_macOS.md)
for that. Some extra steps were needed in my case (most notably due to Qt
installation errors), for which I wrote the installation notes below:

```bash
$ git clone --recurse-submodules https://github.com/vcmi/vcmi.git
$ cd vcmi

# game/h3 is the directory with the original "Heroes 3 SOD" game contents
$ bash -x ./vcmibuilder --data game/h3
$ brew install boost minizip sdl2 sdl2_image sdl2_mixer sdl2_ttf tbb qt
$ pip3 install conan
$ conan profile new default --detect
$ conan profile update settings.compiler.cppstd=11 default

# Install project dependencies
# NOTE: this command *will fail* due to unpatched qt5
$ conan install . \
        --install-folder=conan-generated \
        --no-imports \
        --build=missing \
        --profile:build=default \
        --profile:host=default

# Apply patch from https://codereview.qt-project.org/c/qt/qtbase/+/503172/1/mkspecs/features/toolchain.prf#295
# Then repeat the above command (this time should not fail)
# $ conan install ...

# Build VCMI as a single binary (client+server).
# The CMAKE_EXPORT_COMPILE_COMMANDS is needed by LSP-clangd
$ cmake --fresh -S . -B build -Wno-dev \
    -D CMAKE_TOOLCHAIN_FILE=conan-generated/conan_toolchain.cmake \
    -D CMAKE_BUILD_TYPE=Debug \
    -D ENABLE_SINGLE_APP_BUILD=1 \
    -D ENABLE_CCACHE=1 \
    -D ENABLE_NULLKILLER_AI=0 \
    -D ENABLE_LAUNCHER=0 \
    -D ENABLE_DEV_BUILD=1 \
    -D CMAKE_EXPORT_COMPILE_COMMANDS=1

```

Except the the few hiccups, the process of setting up VCMI went smooth. It was
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

    01           // \x01  ui8   hlp (true, ie. not null)
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

But what good is a sub-second combat if restarting it takes 10+ of loading time?

##### Quick restarts

Fortunately, VCMI features the potentially helpful "quick combat replays"
setting. Sadly, it allows only a _single manual replay_ per battle and only
when the enemy is a neutral army - not particularly useful in my case.
What I need is _infinite quick replays_.

A deeper look into VCMI's internals revels the query stack, where each item
roughly corresponds to an event whose outcome depends on other events which
might occur in the meantime:

<div class="row">
    <div class="col-sm-8 offset-sm-2 mt-8 offset-mt-2 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/querystack.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    The VCMI query stack in a typical scenario
</div>

When the player chooses to restart combat, the results from battle query #2 are
not applied and the entire query is re-inserted back in the stack (with a few
special flags set) -- here is how it looks as well as a communication sequence
diagram:

<div class="row">
    <div class="col-sm-8 mt-8 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/querystack-restart.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm-4 mt-4 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/diagram-replaybattle-sequence.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    The VCMI query stack and a communication diagram for (re-)starting combat (SVG
    <a href="{{ 'assets/img/vcmi-gym/diagram-replaybattle-sequence.svg' | relative_url }}" target="_blank">here</a>)
</div>

Removing the restrictions for restarting a battle involved relatively minor
code changes and even revealed a
[memory leak](https://github.com/vcmi/vcmi/issues/953#issuecomment-1787151606)
in VCMI itself.

Good progress so far, let's back it up with a few numbers.

##### Benchmarks

My simple benchmark setup consists of a simple 2-player micro adventure map
(2x2) where two opposing armies of similar strength (heroes with 7 groups of
units each) engage in a battle which is restarted immediately after it ends:

<div class="row">
    <div class="col-sm-8 offset-sm-2 mt-8 offset-mt-2 mt-md-0">
        {% include figure.liquid path="assets/img/vcmi-gym/testmap-layout.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    A very simple map for testing purposes
</div>

The benchmark was done on my own laptop (M2 Macbook Pro). Here are the
benchmark measurements:
* 16.28 battles per per second
* 862 actions per second (431 per side)

Good enough results for me - there was no need to optimize VCMI further at this
point. It was about time I started thinking on how to integrate it with with
Python code.

#### Embedding VCMI

The [Farama Gymnasium](https://gymnasium.farama.org/) (formerly OpenAI Gym) API
standard is a Python library that aims to make representing RL problems easier.
I like it because of its simplicity and wide adoption rate within the python RL
community (RLlib, StableBaselines, CleanRL are just a few examples). 

Communicating with a C++ program (ie. VCMI) from Python code was a challenge
for me as I had not done it before. Given that the Python interpreter itself is
written in C++, it had to be possible. I googled a bit and stumbled upon 
[pybind11](https://pybind11.readthedocs.io/en/stable/), which definitely looked
like the tool for the job.




/// XXX: talk about disabling the entire GUI later, as part of the
///      SDL main-thread issue




The elephant in the room here is the GUI -- it is not used during training,
consumes additional hardware resources and (most notably) enforces a limit on
the overall game speed due to hard-coded framerate restrictions. It has to go.


The VCMI executable accepts a `--headless` flag which causes a runtime
error as soon as the game is started. Still, the codebase did contain code
paths for running in such a mode, so making it work properly should be an
easy win.


=== also: minimal maps (4x4, 2 heroes, 1 town)
=== also: in-memory only (no disk writes)
