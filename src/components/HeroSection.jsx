export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden py-12 md:py-16">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-primary/5 to-secondary/10"></div>
      
      {/* Decorative Pokeballs */}
      <div className="absolute top-10 left-10 w-32 h-32 opacity-5">
        <div className="w-full h-full relative">
          <div className="absolute inset-0 bg-primary rounded-full"></div>
          <div className="absolute inset-0 bg-background rounded-full top-0 left-0 right-0 bottom-1/2"></div>
        </div>
      </div>
      <div className="absolute bottom-10 right-10 w-24 h-24 opacity-5">
        <div className="w-full h-full relative">
          <div className="absolute inset-0 bg-secondary rounded-full"></div>
          <div className="absolute inset-0 bg-background rounded-full top-0 left-0 right-0 bottom-1/2"></div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-tight text-gradient">
            {'Pok\u00e9dex'}
          </h1>
          
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
            {'Search Pok\u00e9mon by name, number or image'}
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
