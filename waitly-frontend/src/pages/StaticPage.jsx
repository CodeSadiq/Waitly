import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './StaticPage.css';

const PAGE_DATA = {
    about: {
        title: "About Us",
        content: [
            { heading: "Our Mission", text: "At Waitly, we believe your time is too valuable to spend standing in line. Our mission is to eliminate physical queues entirely and return millions of hours back to people's lives." },
            { heading: "Who We Are", text: "We are a team of dedicated engineers, designers, and operational experts passionate about efficiency and user experience." },
            { heading: "What We Do", text: "We provide an intelligent queue management system that allows you to join lines remotely, book time slots in advance, and track your queue position in real time." }
        ]
    },
    careers: {
        title: "Careers",
        content: [
            { heading: "Join the Waitly Team", text: "We are always looking for talented individuals who are passionate about solving real-world problems. If you love building scalable products and creating seamless user experiences, we'd love to hear from you." },
            { heading: "Current Openings", text: "Currently, we do not have any open positions. Please check back later!" }
        ]
    },
    contact: {
        title: "Contact Us",
        content: [
            { heading: "Get in Touch", text: "Have a question, feedback, or need support? We're here to help!" },
            { heading: "Platform Support", text: "Email us at support@wait.ly and our team will get back to you within 24 hours." },
            { heading: "Business Inquiries", text: "For enterprise sales and partnerships, please contact business@wait.ly." }
        ]
    },
    privacy: {
        title: "Privacy Policy",
        content: [
            { heading: "Your Data is Secure", text: "We take your privacy seriously. We only collect the minimal information necessary to place you in a queue and never sell your personal data to third parties." },
            { heading: "Location Data", text: "Location data is only used locally on your device to show you nearby places. We do not store your continuous location history." },
            { heading: "Data Deletion", text: "You can request full deletion of your account and historical queue data at any time from your account settings." }
        ]
    },
    terms: {
        title: "Terms of Service",
        content: [
            { heading: "Usage Guidelines", text: "By using Waitly, you agree to respect the queuing systems and not abuse slot bookings. Repeated no-shows may result in temporary suspension of your account." },
            { heading: "Service Availability", text: "We strive for 99.9% uptime, but Waitly is provided 'as is' without warranties of any kind." },
            { heading: "Account Responsibilities", text: "You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account." }
        ]
    },
    security: {
        title: "Security",
        content: [
            { heading: "Enterprise-Grade Security", text: "All data transmitted to and from Waitly is encrypted using industry-standard protocols (HTTPS/TLS)." },
            { heading: "Data Protection", text: "We utilize secure cloud infrastructure to host our application and databases, ensuring high availability and protection against common threats." },
            { heading: "Reporting Vulnerabilities", text: "If you are a security researcher and have found a vulnerability, please reach out to security@wait.ly." }
        ]
    },
    business: {
        title: "Business Portal",
        content: [
            { heading: "Partner With Us", text: "Bring Waitly to your clinic, restaurant, or service center to improve customer satisfaction and operational efficiency." },
            { heading: "Intelligent Queue Management", text: "Let us handle the crowds. Our platform automatically interleaves walk-in and slotted appointments so your staff can focus on the job rather than the waiting room." },
            { heading: "Getting Started", text: "Register an account as a Staff member or Admin to set up your first queue today. The process takes less than 5 minutes." }
        ]
    },
    'how-it-works': {
        title: "How Waitly Solves Your Waiting Problems",
        content: [
            { heading: "The Problem: Physical Queues", text: "Standing in line is a relic of the past. It wastes time, causes stress, and limits your freedom. Traditional systems force you to stay tethered to a physical location just to keep your spot." },
            { heading: "The Solution: Intelligent Interleaving", text: "Waitly's core innovation is its ability to seamlessly combine scheduled appointments (Slotted tickets) with on-demand walk-ins (Tatkal tickets). Our algorithm ensures that both types of users are served efficiently without long gaps or overcrowding." },
            { heading: "Real-Time Tracking & Freedom", text: "By using Waitly, you can join a queue from miles away and monitor your position in real-time. We provide live wait estimates and instant notifications when it's your turn, allowing you to grab a coffee or run other errands instead of sitting in a waiting room." },
            { heading: "Data-Driven Efficiency", text: "For businesses, Waitly provides deep insights into crowd patterns and service times. This allows staff to proactively manage their workflow and provide a much smoother experience for every visitor." }
        ]
    }
};

export default function StaticPage() {
    const { pageId } = useParams();
    const navigate = useNavigate();
    const data = PAGE_DATA[pageId];

    if (!data) {
        return (
            <div className="static-page-container">
                <div className="static-page-card">
                    <h1 className="static-title">Page Not Found</h1>
                    <button className="cta-button" style={{ background: '#0f172a', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px' }} onClick={() => navigate("/")}>Return Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="static-page-container">
            <div className="static-page-card">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back
                </button>
                <h1 className="static-title">{data.title}</h1>
                <div className="static-content">
                    {data.content.map((section, idx) => (
                        <div key={idx} className="static-section">
                            <h2 className="static-heading">{section.heading}</h2>
                            <p className="static-text">{section.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
