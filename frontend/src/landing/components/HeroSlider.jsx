import { Swiper, SwiperSlide } from 'swiper/react';
import { sliderData } from '../data';
import { EffectFade, Autoplay } from 'swiper/modules';
import 'swiper/css/effect-fade';
import 'swiper/css';

export default function HeroSlider() {
  return (
    <Swiper
      modules={[EffectFade, Autoplay]}
      effect="fade"
      loop
      autoplay={{
        delay: 3000,
        disableOnInteraction: false,
      }}
      className="heroSlider h-[600px] lg:h-[860px]"
    >
      {sliderData.map(({ id, title, bg, btnNext }) => (
        <SwiperSlide className="h-full relative flex justify-center items-center" key={id}>
          <div className="z-20 text-white text-center">
            <div className="uppercase font-tertiary tracking-[6px] mb-5">Just Enjoy & Relax</div>
            <h1 className="font-primary text-[32px] uppercase tracking-[2px] max-w-[920px] lg:text-[68px] leading-tight mb-6">
              {title}
            </h1>
            <button type="button" className="btn btn-lg btn-primary mx-auto">
              {btnNext}
            </button>
          </div>
          <div className="absolute top-0 w-full h-full">
            <img className="object-cover h-full w-full" src={bg} alt="" />
          </div>
          <div className="absolute w-full h-full bg-black/70" />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
