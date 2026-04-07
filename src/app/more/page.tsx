import Navbar from "../../components/Navbar"
import PaidGate from "../../components/PaidGate"
import TransitionLink from "../../components/TransitionLink"

export default function Page() {
  return (
    <main className="min-h-screen app-page-surface">
      <Navbar />
      <PaidGate>
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-4xl font-extrabold">More</h1>
          <p className="mt-2 text-navy-300">Explore upcoming features, FAQs, and support.</p>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="card p-5">
              <div className="font-semibold">Upcoming Features</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-navy-300">
                <li>Team tournaments</li>
                <li>Custom categories</li>
                <li>Advanced analytics</li>
              </ul>
            </div>
            <div className="card p-5">
              <div className="font-semibold">FAQs</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-navy-300">
                <li>How to join a tournament?</li>
                <li>How prizes are distributed?</li>
                <li>What is the scoring system?</li>
              </ul>
            </div>
            <div className="card p-5">
              <div className="font-semibold">Support</div>
              <p className="mt-2 text-sm text-navy-300">Contact iqearnersteam@gmail.com</p>
            </div>
          </div>
          <div className="mt-8">
            <div className="text-xl font-semibold">Dashboard</div>
            <div className="mt-4">
              <TransitionLink href="/user" className="card p-6 block">
                <div className="font-semibold">User Dashboard</div>
                <p className="mt-2 text-sm text-navy-300">View your performance analytics, actions, and recent activity.</p>
                <span className="mt-4 inline-block pill bg-primary">Open</span>
              </TransitionLink>
            </div>
          </div>
        </section>
      </PaidGate>
    </main>
  )
}
