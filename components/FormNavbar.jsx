"use client";
import React from "react";
import "./Styles/Navbar.css"; // Assuming you saved the styles in Navbar.css
import withAuth from "@/components/withAuth";
import { useRouter, useSearchParams } from "next/navigation";

const FormNavbar = ({
  onPreviewClick,
  onAddSectionClick,
  onSaveDraft,
  onSubmit,
  onHeader,
  onFooter,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || sessionStorage.getItem('formsReturnTo') || '/dashboard/forms';

  const handleCancel = () => {
    router.push(returnTo);
  };

  return (
    <header className="main-header">
      <nav className="navbar">
        <div className="logo">
          <a href={returnTo} className="fa-solid addbutton-image">
            Form Builder
          </a>
        </div>
        <div className="navbuttons">
          {/*Footer Icon */}
          <div className="tooltip-wrapper">
            <i
              className="fa fa-cogs footer-icon"
              aria-hidden="true"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", "ADD_FOOTER");
              }}
              onClick={onFooter} // Add the function for the new footer icon
            ></i>
            <span className="tooltip-text add-section-tooltip">Footer</span>
          </div>
          {/* Header Icon */}
          <div className="tooltip-wrapper">
            <i
              className="fa fa-header header-icon"
              aria-hidden="true"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", "ADD_HEADER");
              }}
              onClick={onHeader}
            ></i>
            <span className="tooltip-text add-section-tooltip">Header</span>
          </div>

          <div className="tooltip-wrapper">
            <i
              className="fa fa-file-alt draftbutton-image"
              aria-hidden="true"
              onClick={onSaveDraft}
            ></i>
            <span className="tooltip-text add-section-tooltip">
              Save as Draft
            </span>
          </div>
          <div className="tooltip-wrapper">
            <i
              className="fa fa-check-circle submitbutton-image"
              aria-hidden="true"
              onClick={onSubmit}
            ></i>
            <span className="tooltip-text add-section-tooltip">Submit</span>
          </div>
          <div className="tooltip-wrapper">
            <div className="special">
              <svg
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                viewBox="0 0 24 24"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="preview-icon"
                onClick={onPreviewClick}
              >
                <path d="M5 12s2.545-5 7-5c4.454 0 7 5 7 5s-2.546 5-7 5c-4.455 0-7-5-7-5z"></path>
                <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
                <path d="M21 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2"></path>
                <path d="M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"></path>
              </svg>
              <span className="tooltip-text add-section-tooltip">Preview</span>
            </div>
          </div>
          <div className="tooltip-wrapper">
            <i
              className="fa fa-plus-circle addbutton-image"
              aria-hidden="true"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", "ADD_CATEGORY");
              }}
              onClick={onAddSectionClick} // optional: keep click also
            ></i>
            <span className="tooltip-text add-section-tooltip">
              Add Category
            </span>
          </div>

          <div className="tooltip-wrapper">
            <i
              className="fa fa-arrow-left goback-image"
              aria-hidden="true"
              onClick={handleCancel}
            ></i>
            <span className="tooltip-text add-section-tooltip">Go back</span>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default withAuth(FormNavbar);
