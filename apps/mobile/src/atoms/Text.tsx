// Themed Text — wraps Restyle's createText so the rest of the app can `import
// { Text } from '../../atoms/Text'` and get strict variant typing.

import React from 'react';
import { ThemedText } from '../lib/restyle';

type Props = React.ComponentProps<typeof ThemedText>;

export const Text: React.FC<Props> = (props) => <ThemedText {...props} />;
