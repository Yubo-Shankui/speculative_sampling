// Adapted from the archived CF++ comparison player.
(() => {
  "use strict";
  const review = JSON.parse(document.getElementById("video-review-data").textContent);
  const groups = [...document.querySelectorAll(".video-review")];
  const allVideos = [...document.querySelectorAll(".video-review video")];
  const clips = new Map(review.clips.map(c => [`${c.step}/${c.chunk}/${c.sample}`, c]));
  let sample = review.samples[0].id;
  let playbackGeneration = 0;
  const videos = group => [...group.querySelectorAll("video")];
  const status = (group, message) => { group.querySelector(".play-status").textContent = message; };
  const duration = group => {
    const ds = videos(group).map(v => v.duration);
    return ds.every(d => Number.isFinite(d) && d > 0) ? Math.min(...ds) : 0;
  };
  function pauseAll() {
    playbackGeneration++;
    allVideos.forEach(v => v.pause());
    groups.forEach(g => { g.dataset.syncPlaying = "false"; });
  }
  document.querySelectorAll(".comparison-step").forEach(select => {
    select.addEventListener("change", event => {
      pauseAll();
      groups.forEach(group => {
        group.hidden = group.dataset.step !== event.target.value;
        group.querySelector(".comparison-step").value = event.target.value;
      });
    });
  });
  function changeSample(id) {
    pauseAll();
    sample = id;
    const selected = review.samples.find(s => s.id === id);
    groups.forEach(group => {
      group.querySelector(".sample-select").value = id;
      group.querySelector(".video-prompt").textContent = selected.prompt;
      group.querySelector(".row-seek").value = "0";
      group.querySelector(".row-time").textContent = "0.00 s";
      group.querySelectorAll(".video-card").forEach(card => {
        const clip = clips.get(`${group.dataset.step}/${card.dataset.chunk}/${id}`);
        const video = card.querySelector("video");
        card.querySelector(".video-error").textContent = "";
        video.poster = clip.poster;
        video.src = clip.local;
        video.setAttribute("aria-label", `${clip.step}-step chunk ${clip.chunk} sample ${id}`);
        video.preload = "metadata";
        video.playbackRate = Number(group.querySelector(".speed-select").value);
        card.querySelector(".clip-link").href = clip.local;
        const [n, d] = clip.media.avg_frame_rate.split("/").map(Number);
        card.querySelector(".clip-info").textContent =
          `${clip.media.width}×${clip.media.height} · ${n/d} fps · ${clip.media.duration.toFixed(2)} s`;
        video.load();
      });
      status(group, `Sample ${id}: ready to compare chunk sizes.`);
    });
  }
  function ready(video) {
    if (video.error) return Promise.reject(new Error("A video could not be loaded. Please reload the page."));
    if (video.readyState >= 2) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let timer;
      const cleanup = () => {
        clearTimeout(timer);
        video.removeEventListener("loadeddata", loaded);
        video.removeEventListener("error", failed);
      };
      const loaded = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error("A video could not be loaded. Please reload the page.")); };
      video.addEventListener("loadeddata", loaded);
      video.addEventListener("error", failed);
      timer = setTimeout(() => {
        cleanup();
        reject(new Error("Loading timed out. Please try Play all again."));
      }, 15000);
      video.preload = "auto";
    });
  }
  async function play(group) {
    pauseAll();
    const generation = playbackGeneration;
    const row = videos(group);
    status(group, "Loading all four videos…");
    try {
      await Promise.all(row.map(ready));
      if (generation !== playbackGeneration) return;
      row.forEach(v => {
        v.currentTime = 0;
        v.muted = true;
        v.playbackRate = Number(group.querySelector(".speed-select").value);
      });
      await Promise.all(row.map(v => v.play()));
      if (generation !== playbackGeneration) return;
      group.dataset.syncPlaying = "true";
      status(group, "");
    } catch (err) {
      if (generation !== playbackGeneration) return;
      row.forEach(v => v.pause());
      status(group, err.message);
    }
  }
  allVideos.forEach(video => {
    video.addEventListener("error", () => {
      video.closest(".video-card").querySelector(".video-error").textContent =
        "Video unavailable. Please reload the page.";
    });
  });
  groups.forEach(group => {
    group.querySelector(".sample-select").addEventListener("change", e => changeSample(e.target.value));
    group.querySelectorAll("button[data-action]").forEach(button => button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "play") return void play(group);
      if (action === "pause") {
        playbackGeneration++;
        videos(group).forEach(v => v.pause());
        group.dataset.syncPlaying = "false";
        return void status(group, "Paused. Play individually or use Play all to restart the comparison.");
      }
      const i = review.samples.findIndex(s => s.id === sample);
      const next = (i + (action === "next" ? 1 : -1) + review.samples.length) % review.samples.length;
      changeSample(review.samples[next].id);
    }));
    group.querySelector(".speed-select").addEventListener("change", e => {
      videos(group).forEach(v => { v.playbackRate = Number(e.target.value); });
    });
    group.querySelector(".row-seek").addEventListener("input", e => {
      playbackGeneration++;
      group.dataset.syncPlaying = "false";
      const end = duration(group);
      if (!end) return void status(group, "Video metadata is still loading. Try seeking again shortly.");
      const time = Number(e.target.value) / 1000 * end;
      videos(group).forEach(v => { v.pause(); v.currentTime = time; });
      group.querySelector(".row-time").textContent = `${time.toFixed(2)} s`;
      status(group, "Paused at the selected position. Play all restarts from the beginning.");
    });
  });
  setInterval(() => {
    groups.forEach(group => {
      const row = videos(group), master = row[0], end = duration(group);
      if (!end || master.paused) return;
      group.querySelector(".row-seek").value = String(Math.round(master.currentTime / end * 1000));
      group.querySelector(".row-time").textContent = `${master.currentTime.toFixed(2)} s`;
      if (group.dataset.syncPlaying === "true") {
        row.slice(1).forEach(v => {
          if (!v.paused && Math.abs(v.currentTime - master.currentTime) > 0.15)
            v.currentTime = master.currentTime;
        });
      }
    });
  }, 150);
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseAll(); });
})();
