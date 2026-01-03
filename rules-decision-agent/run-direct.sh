#!/bin/bash
# Compile and run the agent directly with the provided prompt
npm run build
npm run start -- "$@"
