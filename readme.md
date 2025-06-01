The goal here is going to create an end-to-end coding AI.
It will take as input:
- A ticket (some work to be done)
- A github repository (where the code is)

It will output:
- A pull request that solves the ticket.


We will build this step by step, starting with simplified problems first, and then gradually adding missing pieces.

# Prerequisites
Install github command line:
```bash
brew install gh
```

# Step  1: Command line interface to make some changes to a local repository
At this point we can `git clone` a repository to somewhere under `user_code` and then use a command line interface like so:
```bash
npx tsx coder.ts solve <repo_name> <task_description>
```

We have a simple LLM graph set up using `langchain/langraph` with two nodes - an LLM and a tool node. There are three tools we've implemented as local functions:
- list directory
- read file
- write file

This is enough to have a very simple but useful agent that can make changes to a project.

# Step 2: create a pull request
This means creating a branch and then making the PR.

# Step 3: exercise the code it writes to make sure it works
We need to figure out how to exercise the code. This means finding tests and executing them.

# Step 3.5: remember certain things like making a git branch, making a PR, etc. without having to be told every time

# Step 3.9: side quest - sometimes there are errors
E.g. error creating a branch (because same name already exists) or creating PR.
Should do something about it, at least let the user know.

# Step 4: have better understanding of the code it is working with

# Step 5: plan sophisticated tickets and execute changes step-by-step

# Step 6: run asynchronously, many projects at once

# Step 7: integrate with a ticket system like Jira or GitHub issues