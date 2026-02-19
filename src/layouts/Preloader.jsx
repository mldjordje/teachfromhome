import appData from "@data/app.json";

const Preloader = () => {
  return (
    <>
      {/* Preloader */}
      <div className="preloader">
        <div className="preloader__spinner">
          <span className="preloader__double-bounce" />
          <span className="preloader__double-bounce preloader__double-bounce--delay" />
        </div>
      </div>
    </>
  );
};
export default Preloader;
