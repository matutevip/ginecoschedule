import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { SiInstagram } from "react-icons/si";
import BookingForm from "@/components/booking-form";
import { useEffect, useState } from "react";

// Reutilizamos la misma función de detección de subdominio admin
const isAdminSubdomain = () => {
  const hostname = window.location.hostname;
  const isSubdomain = hostname.startsWith("admin.");
  const urlParams = new URLSearchParams(window.location.search);
  const adminParam = urlParams.get('admin') === 'true';
  return isSubdomain || adminParam;
};

export default function Home() {
  const [_, navigate] = useLocation();
  const [showAdminButton, setShowAdminButton] = useState(false);
  
  // Detectar si debemos mostrar el botón de admin
  useEffect(() => {
    // Solo mostrar el botón si estamos en modo desarrollo o si tenemos una cookie especial
    const isDevEnvironment = process.env.NODE_ENV === 'development';
    const hasAdminAccessCookie = document.cookie.includes('adminAccess=true');
    
    // Para fines de testing, también podemos mostrar el botón con un parámetro URL temporal
    const urlParams = new URLSearchParams(window.location.search);
    const showAdmin = urlParams.get('showAdmin') === 'true';
    
    setShowAdminButton(isDevEnvironment || hasAdminAccessCookie || showAdmin);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="bg-[#e6a6b0] border-b border-black relative z-20">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="font-['Mr_De_Haviland'] text-2xl">
            <h1>Dra. Jazmín Andrea Montañes</h1>
            <p className="font-['Outfit'] text-sm">
              - Medica Especialista en Ginecología y Obstetricia -
            </p>
            <p className="font-['Outfit'] text-sm">
              Dia y Horarios de Atención: Miércoles de 09 a 12 hs
            </p>
          </div>
          {showAdminButton && (
            <div>
              <Button
                variant="ghost"
                className="text-sm"
                onClick={() => navigate("/admin")}
              >
                Admin Access
              </Button>
            </div>
          )}
        </nav>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="relative h-[700px] md:h-[600px] mt-12">
          {/* Background Image */}
          <div className="absolute inset-0 bg-[url('https://i.ibb.co/zb91467/Fondo-hero.png')] bg-contain bg-no-repeat z-0" />

          {/* Hero Image */}
          <img
            src="https://i.ibb.co/NTDn46n/item-large.png"
            alt="Doctor's Portrait"
            className="absolute left-0 top-0 h-auto w-full max-w-[90%] md:max-w-[70%] lg:max-w-[800px] md:max-h-[800px] object-contain z-10"
          />

          {/* Hero Text */}
          <div className="absolute right-0 top-52 md:top-12 p-4 md:p-8 max-w-full md:max-w-[600px] z-10 bg-white/80 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none rounded-lg md:rounded-none shadow-lg md:shadow-none mx-3 md:mx-0">
            <h1 className="font-['Outfit'] text-2xl md:text-4xl font-bold mb-2 md:mb-4 text-[#333]">
              Dra. Jazmin Montañés
            </h1>
            <p className="font-['Outfit'] text-lg md:text-xl mb-3 md:mb-6 text-[#444]">
              Médica especialista en Ginecología y Obstetricia
            </p>
            <p className="font-['Outfit'] text-base md:text-lg mb-4 md:mb-8 text-[#555]">
              Conseguí tu turno
            </p>
            <Button
              size="lg"
              onClick={() => {
                const bookingSection =
                  document.getElementById("booking-section");
                bookingSection?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-[#e6a6b0] text-black hover:bg-[#fadadd] font-['Outfit'] font-bold text-base md:text-xl py-4 md:py-6 px-6 md:px-8 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 mb-4 md:mb-8"
            >
              Saca un turno
            </Button>
            <a
              href="mailto:info@jazmingineco.com.ar"
              className="block font-['Outfit'] text-lg md:text-xl font-bold text-[#444]"
            >
              info@jazmingineco.com.ar
            </a>
            <a
              href="https://www.google.com/maps/place/Av.+Rivadavia+15822,+B1706+Haedo,+Provincia+de+Buenos+Aires,+Argentina/@-34.6444468,-58.5907634,17z/"
              target="_blank" 
              rel="noopener noreferrer"
              className="font-['Outfit'] text-base md:text-lg mt-2 md:mt-4 block text-[#555]"
            >
              Consultorio: Av. Rivadavia 15822, Haedo, Buenos Aires
            </a>
          </div>
        </div>

        {/* Booking Form */}
        <div id="booking-section" className="py-12 relative z-20">
          <BookingForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#e6a6b0] border-t border-black mt-20">
        <div className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <a
              href="https://www.google.com/maps/place/Av.+Rivadavia+15822,+B1706+Haedo,+Provincia+de+Buenos+Aires,+Argentina/@-34.6444468,-58.5907634,17z/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-bold hover:text-black transition-colors"
            >
              Consultorio: Av. Rivadavia 15822, Haedo, Buenos Aires
            </a>
          </div>
          <div className="text-center md:text-center">
            <p className="text-xs text-gray-700 mt-8">
              Desarrollo y diseño por{" "}
              <a
                href="https://cafeenjarritoweb.com"
                target="_blank"
                className="hover:text-white transition-colors"
              >
                cafeenjarritoweb
              </a>
            </p>
          </div>
          <div className="text-center md:text-right">
            <a href="mailto: info@jazmingineco.com.ar" className="block mb-2">
              info@jazmingineco.com.ar
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
    </div>
  );
}
