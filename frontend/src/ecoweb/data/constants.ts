import type { SliderSlide } from '../types';
import images from '../assets';

// Options for Adults dropdown in BookForm; first char used for total guest count in RoomContext.
export const adultsList: { name: string }[] = [
  { name: '1 Adulto' },
  { name: '2 Adultos' },
  { name: '3 Adultos' },
  { name: '4 Adultos' },
];

// Options for Kids dropdown; "0 Kid" displayed as "No Kid" in KidsDropdown.
export const kidsList: { name: string }[] = [
  { name: '0 Niños' },
  { name: '1 Niño' },
  { name: '2 Niños' },
  { name: '3 Niños' },
  { name: '4 Niños' },
];

// Hero slider slides: id, title, background image path, CTA button text.
export const sliderData: SliderSlide[] = [
  {
    id: 1,
    title: 'Your Luxury Hotel For Vacation',
    bg: images.Slider1,
    btnNext: 'See our rooms',
  },
  {
    id: 2,
    title: 'Feel Relax & Enjoy Your Luxuriousness',
    bg: images.Slider2,
    btnNext: 'See our rooms',
  },
  {
    id: 3,
    title: 'Your Luxury Hotel For Vacation',
    bg: images.Slider3,
    btnNext: 'See our rooms',
  },
];

// Rules shown in Room Details sidebar (check-in/out times, no smoking, no pet).
export const hotelRules: { rules: string }[] = [
  { rules: 'Check-in: 3:00 PM - 9:00 PM' },
  { rules: 'Check-out: 10:30 AM' },
  { rules: 'No fumar' },
  { rules: 'No mascotas' },
];
