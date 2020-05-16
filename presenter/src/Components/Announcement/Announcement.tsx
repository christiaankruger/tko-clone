import React, { FC } from 'react';
import { createBemHelper } from '../../util/BEM';
import './Announcement.scss';
import { Heading } from '../shared/Heading';
import { Shirt } from '../../../../server/Games/TKOMechanics';
import { ShirtDisplay } from '../shared/ShirtDisplay';

const BEM = createBemHelper('announcement');

export interface AnnouncementProps {
  heading: string;
  subtext?: string;
  shirt?: Shirt;
}

export const Announcement: FC<AnnouncementProps> = (props) => {
  const { heading, subtext, shirt } = props;
  return (
    <div className={BEM()}>
      <Heading>{heading}</Heading>
      {subtext && <div className={BEM('subtext')}>{subtext}</div>}
      {shirt && <ShirtDisplay shirt={shirt} />}
    </div>
  );
};
