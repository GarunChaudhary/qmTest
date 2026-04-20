export const handlePrint = (contentRef) => {
  if (typeof window === "undefined") {
    console.error("Window is not available.");
    return;
  }

  if (!contentRef || !contentRef.current) {
    console.error("Form content not found");
    return;
  }
  const content = contentRef.current;

  // Clone the content
  const clonedContent = content.cloneNode(true);

  // Synchronize form element states
  const originalInputs = content.querySelectorAll("input, select, textarea");
  const clonedInputs = clonedContent.querySelectorAll(
    "input, select, textarea"
  );

  originalInputs.forEach((originalInput, index) => {
    const clonedInput = clonedInputs[index];
    if (!clonedInput) return;

    if (originalInput.type === "radio" || originalInput.type === "checkbox") {
      clonedInput.checked = originalInput.checked;
      if (clonedInput.checked) {
        clonedInput.setAttribute("checked", "checked");
      } else {
        clonedInput.removeAttribute("checked");
      }
    }

    if (originalInput.tagName === "SELECT") {
      Array.from(clonedInput.options).forEach((option) => {
        option.selected = option.value === originalInput.value;
        if (option.selected) {
          option.setAttribute("selected", "selected");
        } else {
          option.removeAttribute("selected");
        }
      });
    }

    if (originalInput.tagName === "TEXTAREA" || originalInput.type === "text") {
      clonedInput.value = originalInput.value;
      clonedInput.textContent = originalInput.value; // Ensure textarea content is included
      clonedInput.setAttribute("value", originalInput.value); // Reflect in HTML
    }
  });
  // Prepare print styles
  const printStyles = `
    @media print {
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        color: black;
        background: white;
      }

      .no-print {
        display: none !important;
      }

      .preview-section {
        width: 100%;
        margin: 0;
        padding: 0;
      }

      .print-container{
        border: 5px solid black;
        padding: 20px;
        box-sizing: border-box;
      }
      .form-details {
         text-align: center;
          justify-content: center;
          margin-bottom: 20px;
          background-color: #d6eaff;
          padding: 5px;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          box-shadow: 1px 1px 1px 1px #d6eaff;
      }
        .form-details h3 {
          font-size: 18px;
          margin-bottom: 10px;
          margin-top: 8px;
          color: hsl(var(--foreground));
        }

        .form-details p {
          max-width: 70vw;
          margin: 0 auto;
          text-align: center;
          font-size: 14px;
          color: hsl(var(--foreground));
          }

        .form-score{
          display: flex;
          align-items: center;
          justify-content: right;
          width: 100%; 
          padding-right: .5vw;
          position: relative;
          bottom: 3vh;
        }

        .totalform-score {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin: 0 5px;
          position: relative;
          top: 0;           
          right: 0;
          background-color: white;  
        }

        .totalform-score h4 {
          padding: 0px;
          font-size: 10px;
          color: hsl(var(--primary));
          margin: 0;
          background: transparent;
        }

        .Form-Max-Score-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin: 0 5px;
          position: relative;
          top: 0;
          right: 0;
          width: auto;
          background-color: white;
        }
        
        .Form-Max-Score-container h2 {
          font-size: 10px;
          color: hsl(var(--primary));
          margin: 0;
          background: transparent;
        }

        .form-details p {
          max-width: 70vw;
          margin: 0 auto;
          text-align: center;
          font-size: 14px;
          color: hsl(var(--foreground));
        }

        .preview-section h3 {
            padding: 4px 8px;
            margin-top: 15px;
            border-radius: 10px;
            background: #b7daff;
            font-size: 14px;
            margin-bottom: 10px;
            color: hsl(var(--foreground));
        }
          
        .header-section, 
        .footer-section {
          display: flex;
          justify-content: space-between; /* left & right items space out */
          align-items: center;
          width: 100%;
          padding: 10px 15px;
          border: 1px solid var(--brand-primary);        /* light border */
          border-radius: 6px;            /* smooth rounded corners */
          background-color: #f9f9f9;     /* light grey background */
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); /* subtle shadow */
          font-size: 14px;
          color: #333;
        }

          
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .preview-subsection h4 {
          font-size: 12px;
          margin-top: 15px;
          background-color: #d6eaff;
          border-radius: 10px;
          padding: 8px;
          color: hsl(var(--foreground));
        }
              
        .sub-question-score {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px 6px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin: 0 5px;
        }
        .sub-question-score h4, .Question-Max-Score-container h2 {
          font-size: 10px;
          color: hsl(var(--primary));
          margin: 0;
          background: transparent;
          white-space: nowrap;
        }

        .preview-subsection .preview-question {
          padding: 15px;
          border-radius: 8px;
        }

        .sub-question-header {
          display: flex;
          width: 84vw;
          margin-left: -.7vw;
        }

        .question-header {
          display: flex;
          width: 95vw;
          align-items: center;
          margin-left: -.7vw;
        }
    
        .preview-subsection p {
          font-size: 12px;
          color: hsl(var(--foreground));
        }

        .section-score-box {
            display: flex;
            align-items: center;
            justify-content: right;
            width: 100%;
            padding-right: 0vw;
        }

        .subsection-score {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin: 0 5px;
          position: relative;
          top: 0;
          right: 0;
          background-color: white;
      }
        .subsection-score h4 {
          padding: 0px;
          font-size: 10px;
          color: hsl(var(--primary));
          margin: 0;
          background: transparent;
        }

        .Sub-Max-Score-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin: 0 5px;
          position: relative;
          top: 0;
          right: 0;
          width: auto;
          white-space: nowrap;
          background-color: white;
        }

        .Sub-Max-Score-container h2 {
          font-size: 10px;
          color: hsl(var(--primary));
          margin: 0;
          background: transparent;
          white-space: nowrap;
        }

       
        .scorebox {
          display: flex;
          align-items: center;
          justify-content: right;
          width: 20vw;
          padding-right: 0vw;
        }
    
        .preview-options {
            margin-top: 5px;  
        }
    
        input[type="radio"], input[type="checkbox"] {
          transform: scale(1.2);
        }
  
        input[type="text"], textarea {
          width: 100%;
          font-size: 14px;
          min-height: 50px;
          border: 1px solid #ccc;
          padding: 5px;
          box-sizing: border-box;
        }
  
        textarea {
          min-height: 100%;
        }

      }
    `;

  const styleTag = document.createElement("style");
  styleTag.innerHTML = printStyles;
  document.head.appendChild(styleTag);

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Failed to open a new print window.");
    return;
  }

  // Write content to the print window
  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Printable Form</title>
        <style>${printStyles}</style>
      </head>
      <body>${clonedContent.outerHTML}</body>
    </html>
  `);
  printWindow.document.close();

  // Trigger print and cleanup
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
    styleTag.remove();
  };
};
