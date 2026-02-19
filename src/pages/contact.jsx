import Link from "next/link";

const ContactRedirect = () => {
  return (
    <div className="tfh-page">
      <div className="tfh-card">
        <h3>Application moved</h3>
        <p>Use the new application flow to continue onboarding.</p>
        <Link href="/apply" className="tfh-btn">
          Continue application
        </Link>
      </div>
    </div>
  );
};

export const getServerSideProps = async () => ({
  redirect: {
    destination: "/apply",
    permanent: false,
  },
});

export default ContactRedirect;
