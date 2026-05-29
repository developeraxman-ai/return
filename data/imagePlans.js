export const RETURN_40S_IMAGE_PLAN = [
  {
    startMs: 0,
    label: "Dark room",
    media: "/media/return-01-dark-room.png",
    mediaType: "image",
  },
  {
    startMs: 6500,
    label: "Night plan",
    media: "/media/return-02-night-plan.png",
    mediaType: "image",
  },
  {
    startMs: 13000,
    label: "Alarm morning",
    media: "/media/return-03-alarm-morning.png",
    mediaType: "image",
  },
  {
    startMs: 20000,
    label: "Mirror excuses",
    media: "/media/return-04-mirror-excuses.png",
    mediaType: "image",
  },
  {
    startMs: 27000,
    label: "Gym dawn",
    media: "/media/return-05-gym-dawn.png",
    mediaType: "image",
  },
  {
    startMs: 34000,
    label: "Road return",
    media: "/media/return-06-road-return.png",
    mediaType: "image",
  },
];

export function getImagePlanForTime(plan, timeMs) {
  const safeTimeMs = Math.max(0, Number(timeMs) || 0);
  let activeItem = plan[0] || null;

  plan.forEach((item) => {
    if (safeTimeMs >= item.startMs) {
      activeItem = item;
    }
  });

  return activeItem;
}
