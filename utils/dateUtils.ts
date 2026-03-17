import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

export const groupNotifications = (notifications: any[]) => {
  const groups: { [key: string]: any[] } = {
    'Today': [],
    'Yesterday': [],
    'Earlier': [],
  };

  notifications.forEach((note) => {
    const date = dayjs(note.createdAt);
    if (date.isToday()) groups['Today'].push(note);
    else if (date.isYesterday()) groups['Yesterday'].push(note);
    else groups['Earlier'].push(note);
  });

  return Object.keys(groups)
    .filter((key) => groups[key].length > 0)
    .map((key) => ({
      title: key,
      data: groups[key],
    }));
};