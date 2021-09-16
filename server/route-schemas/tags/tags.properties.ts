const basicProps = {
  meta_title: {
    type:'string',
    description: 'The title of the tag as seen in UI'
  },
  description: {
    type: 'string',
    description: 'A short description about the tag'
  },
  meta_description: {
    type: 'string',
    description: 'Need to clarify on this field'
  },
  feature_image: {
    type: 'string',
    description: 'A url for the image representing the tag'
  },
  visibility: {
    type: 'string',
    enum: ['public', 'private'],
    description: 'The visibility status of a tag. Default is `public` '
  },
  status: {
    type: 'string',
    enum: ['active', 'inactive'],
    description: 'Current usage status of the tag. Default is `active`'
  }
};

export const createTagProps = {
  name: {
    type: 'string',
    description: 'Name of the tag that follows the expression `/^[a-z_]+$/`'
  },
  ...basicProps
};

export const updateTagProps = {
  ...basicProps
};
