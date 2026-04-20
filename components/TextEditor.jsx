import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import "./Styles/form_builder_2.css";

function RichTextEditor({ placeholder, value, onChange}) {

  return (
    <div>
      <ReactQuill
      
      className="form-builder-text-editor"
        //  theme="snow"
         value={value}
         onChange={onChange}
         placeholder={placeholder}
        modules={{
          toolbar: [
            [{ header: [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            
          ]
        }}
        formats={[
          'header',
          'bold', 'italic', 'underline', 'strike',
          'list', 'bullet',
          
        ]}
      />

    </div>
  );
}

export default RichTextEditor;
