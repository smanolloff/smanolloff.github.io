---
layout: page
title: qwop-gym
description: An AI for Bennet Foddy's game called "QWOP"
img: assets/img/qwop-gym/cover.jpg
importance: 2
category: AI
related_publications: false
---

<a href="https://www.foddy.net/Athletics.html">QWOP</a> is simple browser-based
game about running fast down a 100-meter track. The game is really hard to play
and you will quickly find yourself unable to make Atlas run without falling.
And it's a perfect task for AI.

<div class="row justify-content-md-center">
    <div class="col-sm-6">
        {% include figure.liquid path="assets/img/qwop-gym/qwop-gameplay.png" title="QWOP" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>


### Problem Statement

The game is nearly impossible for a human to play. Few people in this world have
ever been able to master it. According to the
<a href="https://www.speedrun.com/qwop">QWOP leaderboard</a>, the
fastest QWOP runner in the world can reach the finish line in 4.6 in-game
seconds (45.53 real-time seconds).

Can an AI learn to play this game, and how would it perform compared to the
best players in the world? 

### Objective

Train an AI agent that can surpass the QWOP world record.

### Proposed Solution

Transform QWOP into a reinforcement learning environment and forge an AI which
meets the objective.

Using the RL environment, train an AI agent and compare its performance with
the results recorded by the world's top players.

Contribute to the Gymnasium project by submitting the RL environment as an
official
[third-party environment](https://gymnasium.farama.org/main/environments/third_party_environments/).

### Approach

This is the section in which I break down the objective, lay out an
execution plan for completing the task, describe the implementation details and
talk share the challenges I have encountered along the way.

Since the project was already completed by the time I decided to create this
web page, I will start by posting the results first and will leave this section
blank, eventually filling it up with content whenever I find time to.

#### Converting QWOP into an RL environment

QWOP is a JavaScript game which relies on WebGL -- this means it _must_ run
within a web browser and communicate to a Python backend (which handles the
training).

<div class="row justify-content-md-center">
    <div class="col-sm-8">
        {% include figure.liquid path="assets/img/qwop-gym/communication.png" title="Communication diagram" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

For the purpose I had to find out how to send the information from the game
(i.e. the browser) to the python process. The obvious approach was some kind of
HTTP protocol, so I developed a custom communication protocol for the purpose
bu launching a WebSocket server and a web browser as soon as `QwopEnv`
(as the RL env is named)  is started.
Both the env and the browser connect to the WebSocket server, which acts as a
message proxy between the two clients - a process best described via the
sequence diagram below:

<div class="row justify-content-md-center">
    <div class="col-sm-6">
        {% include figure.liquid path="assets/img/qwop-gym/bootstrap.png" title="Bootstrap process" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

##### Communication protocol

The env<->browser communication is governed by a protocol I designed
specifically for this purpose. It consists of a 1-byte header and
variable-length payload, here are some examples:

| Message description | byte 1 | byte 2 | bytes 3+ |
|-------------|--------|--------|----------|
| Registration request | `0` | (id) | |
| Game command: "W" key | `3` | `0b00000101` | step (1 byte) + reward (4 bytes) + total_reward (4 bytes) |
| Game command: restart game | `3` | `0b00100001` | |
| Game command: take screenshot | `3` | `0b10000000` | |
| Game response: observation | `4` | `0b00000000` | time (4 bytes) + distance (4 bytes) + body state (60 bytes) |
| Game response: observation (game over) | `4` | `0b00000010` | time (4 bytes) + distance (4 bytes) + body state (60 bytes) |
| Game response: screenshot (JPEG) | `5` | `0b00000000` | (image data) |
| Game response: screenshot (PNG) | `5` | `0b00000001` | (image data) |
| Log | `6` | (utf-8 text) | (utf-8 text - cont.) |
| Error | `7` | (utf-8 text) | (utf-8 text - cont.) |
| Reload page | `8` | | |

##### 🕹️ Actions

There are 16 discrete actions in the game, corresponding to 0, 1, 2, 3 or
4-key combinations of the below keys:

- Q (thighs 1)
- W (thighs 2)
- O (calves 1)
- P (calves 2)

Performing an action is done via the env's `step` method, which expects an
integer as input, so each action is mapped to a key (combination) as follows:

`0`=(none), `1`=Q, `2`=W, `3`=O, `4`=P, `5`=Q+W, `6`=Q+O, ..., `15`=Q+W+O+P

Some of the key combinations in the game are redundant: for example, pressing
Q+W is equivalent to pressing just Q. Similarly, O+P is the same as O and so
on. By default, those are still considered valid actions by QwopEnv and
agents (including humans) should learn this peculiarity on their own.
For the sake of reducing training times, however, removing redundant actions is
made configurable in the form of the `reduced_action_set` env parameter, which
reduces the total number of actions from 16 to just 9.

Optionally, an _extra_ action can be added for the T key in order
to immediately terminate the env - useful when playing manually to force a
restart (instead of having to wait for the athlete to fall).
This behaviour is controlled by the `t_for_terminate` env parameter, which
increases the total number of actions to 17 (or 10, if `reduced_action_set`
is also enabled).

##### 👁️ Observations

On each step, the browser sends the following data to the RL env:

* game state (termination condition)
* time elapsed (used in reward calculations)
* distance ran (used in reward calculations)
* body state

The body state contains data about the athlete's 12 body parts:
- Torso
- Head
- Left Arm
- Left Calf
- Left Foot
- Left Forearm
- Left Thigh
- Right Arm
- Right Calf
- Right Foot
- Right Forearm
- Right Thigh

Each of those body parts is represented by 5 floats:

|  #  | Description        | Min   | Max   | Unit        | Note
|-----|--------------------|-------|-------|-------------|------------
| 0   | position (x-axis)  | -10   | 1050  | decimeters  |
| 1   | position (y-axis)  | -10   | 10    | decimeters  |
| 2   | angle vs horizon   | -6    | 6     | radians     |
| 3   | velocity (x-axis)  | -20   | 60    | ?           |
| 4   | velocity (y-axis)  | -25   | 60    | ?           |

This makes total of `60` floats for the body state, which are normalized and
then returned as the `obs` (an `np.ndarray((60,), dtype=np.float32)`) element
of the env's `step` return values.

##### 🍩 Rewards

The reward on each step is equal to:

$$
R = C_s\frac{\Delta_s}{\Delta_t} - \frac{C_t}{C_f}\Delta_t
$$

where:
* **R** is the reward
* **Δ<sub>s</sub>** is the change in distance ran since last step
* **Δ<sub>t</sub>** is the change in time elapsed since last step
* **C<sub>s</sub>** is a constant (configurable via `speed_rew_mult`)
* **C<sub>t</sub>** is a constant (configurable via `time_cost_mult`)
* **C<sub>f</sub>** is a constant (configurable via `frames_per_step`)

##### 💀 Termination

The env will terminate whenever the athlete:
* _steps_ or _falls_ beyond the 100-meter mark (considered a success)
* reaches the 105-meter mark (considered a success) *
* falls anywhere else (considered a failure)
* reaches the -10-meter mark (considered a failure)

\* In rare cases, the athlete goes past the finish line without the game
detecting ground contact due to a bug, so a 105m end-game condition was added.

##### <a id="rendering"></a> 🖼️ Rendering

The env supports two render modes: `browser` and `rgb_array`. In both cases, a
call to `.render()` will render a frame in the browser, but with `rgb_array`
the frame itself is also returned as an image.
This is needed when a human is playing, as this image is re-rendered in a
pygame window which also receives the keyboard input. As this would result in
frames being visualized twice (in both the browser and the pygame window), the
configuration parameter `game_in_browser` is used to hide the browser part.

<div class="row justify-content-md-center">
    <div class="col-sm">
        {% include figure.liquid path="assets/img/qwop-gym/play.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm">
        {% include figure.liquid path="assets/img/qwop-gym/replay.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
    <div class="col-sm">
        {% include figure.liquid path="assets/img/qwop-gym/train.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

<div class="row justify-content-md-center">
    <div class="col-sm-8">
        {% include figure.liquid path="assets/img/qwop-gym/demo-2.gif" title="AI playing VCMI" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    An AI playing QWOP with realtime debug data rendering
</div>


##### ♻️ Resetting

This env supports two reset modes: _soft_ and _hard_.

In both cases, QwopEnv instance variables are reset and the difference lies in
how QWOP reset is performed.

**Soft** resets instruct the game engine to start a new game. Repeating the
exact same actions after a soft reset _may_ result in a different outcome.

**Soft** resets are lightweight, fast and unobtrusive. They are enabled by
default.

For most intents and purposes, soft resets should be enough, as they provide
a _nearly_ deterministic env - a state-action will yield a predictable next
state in ~99.99% of the times (empirically measured).

**Hard** resets will re-load the web page (QWOP.html) ie. the entire game
engine is re-initialized. Repeating the exact same actions after a hard
reset _will_ result in the exact same outcome.

**Hard** resets are cumbersome and more obtrusive (each page reload causes
a visible flicker). To enable it, pass the `reload_on_reset=True` keyword
argument to the QwopEnv constructor.

With this reset mode, the environment becomes fully deterministic,
given the step number is part of the state: an action `a` at state `s` will
always yield exactly one specific state `s+1`.

##### Configuration parameters

A list of all aspects of the game I have made configurable:

| name | type | default | description |
|------|------|---------|-------------|
|`browser`|string|Path to the web browser binary|
|`driver`|string||Path to the chromedriver binary|
|`render_mode`|string||Supported render modes (either `browser` or `rgb_array`)|
|`failure_cost`|number|`10`|Subtracted from the reward at the end of unsuccessful episodes|
|`success_reward`|number|`50`|Added to the reward at the end of successful episodes|
|`time_cost_mult`|number|`10`|Multiplier for the amount subtracted from the reward at each step|
|`frames_per_step`|int|`1`|Number of frames to advance per call to `.step` (aka. _frameskip_)|
|`stat_in_browser`|bool|`False`|Display various game stats in the browser next to the game area|
|`game_in_browser`|bool|`True`|Display the game area itself in the browser|
|`text_in_browser`|string||Display a static text next to the game area in the browser|
|`reload_on_reset`|bool|`False`|Perform a page reload on each call to `.reset` (aka. "hard reset")|
|`auto_draw`|bool|`False`|Automatically draw the current frame on each call to `.reset`|
|`reduced_action_set`|bool|`False`|Reduce possible actions from 16 to just 9|
|`t_for_terminate`|bool|`False`|Map an additional action to the T key for terminating the env|
|`loglevel`|string|`WARN`|Logger level (DEBUG|INFO|WARN|ERROR)|
|`seed`|int||Seed (must be between 0 and 2^31), auto-generated if blank|
|`browser_mock`|bool|`False`|Used for debugging when no browser is needed|


### Results

I used different RL algorithms to train AI agents with varying levels of
success. BC (Behavioural Cloning), PPO (Proximal Policy Optimization), DQN
(Deep Q-Network), QR-DQN (Quantile Regression DQN) are among some of the
popular RL algorithms I used throughought this experiment.

<div class="row justify-content-md-center">
    <div class="col-sm-8">
        {% include figure.liquid path="assets/img/qwop-gym/demo.gif" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Several AI agents playing QWOP, but trained with different RL algorithms
</div>

The QRDQN agent performed best and topped at 5.3s game-time after several hours
of training, which would place it on 5th place on the
<a href="https://www.speedrun.com/qwop">QWOP leaderboard</a>.

I have prepared a video which showcases the results of the qwop-gym experiment:

<div class="row justify-content-md-center">
    <div class="col-sm-8">
        <iframe width="560" height="315" src="https://www.youtube.com/embed/2qNKjRwcx74?si=cJxVNfl_rh0ly-8x" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    </div>
</div>

### Conclusion

The AI showed a remarkable performance and was able to reach the
finish line in 5.3 seconds, meaning it was among the top 5 best players in the
world.

Although part of the objective (to outperform the world champion) was not met,
I felt confident that it was just a matter of time until that happened given
more time and effort were to be invested. The journey was very educational and
armed me with confidence, experience and knowledge which I was eager to 
immediately put to work in new, more sophisticated RL projects instead.
