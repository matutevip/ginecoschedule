import { SiInstagram } from "react-icons/si";

export function Footer() {
  return (
    <footer className="bg-[#e6a6b0] border-t border-black">
      <div className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <a
            href="https://goo.gl/maps/YQZXKGQvJZ2X6QWZA"
            target="_blank"
            className="text-white font-bold hover:text-black transition-colors"
          >
            Consultorio: Av. Rivadavia 15822, Haedo
          </a>
        </div>
        <div className="text-center md:text-left">
          <a 
            href="https://cafeenjarritoweb.com" 
            target="_blank"
            className="text-black hover:text-white transition-colors font-medium"
          >
            Desarrollo y diseño por cafeenjarritoweb
          </a>
        </div>
        <div className="text-center md:text-right">
          <a href="mailto:drajazmingineco@gmail.com" className="block mb-2">
            drajazmingineco@gmail.com
          </a>
          <span className="text-white">Seguime en:</span>
          <div className="mt-2 space-x-4 flex justify-center md:justify-end items-center">
            <a
              href="https://www.instagram.com/jazmingineco?igsh=MTM2bXoydzUyMHlzMg=="
              target="_blank"
              className="text-white hover:text-black transition-colors"
            >
              <SiInstagram className="w-6 h-6" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}