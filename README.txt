Speculative Sampling — Anonymous Supplementary Material

Open index.html in a current desktop browser. All scripts, fonts, images, and
videos are included locally; an Internet connection is not required.

If your browser restricts local-file media, serve this folder over local HTTP:
    python3 serve.py --port 8766
Then open http://127.0.0.1:8766/ in a browser. The included server supports
video byte-range requests for loading and seeking. It listens only on this computer.

Contents
- Two recorded interactive demonstrations.
- LTX quality under update probabilities: all 30 matched image–prompt cases.
  Columns: K9 0%, K9 35%, K9 70%, K9 100%, native frame-wise K1.
  Prompts stay fixed; the update events discard and regenerate predictions.
- LTX action changes: 25 selected cases, three matched configurations.
  The instruction banner shows the scheduled prompt and its video timestamp.
- Existing chunk-size comparison: five cases, three sampling-step settings,
  and four chunk sizes.

Choose a case, then use “Play all from start” for synchronized comparison.
“Seek all” moves the videos in each comparison together.
“Open video” opens the complete video for a larger view.
